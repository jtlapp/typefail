
import * as ts from "typescript";
import * as minimatch from 'minimatch';
import * as glob from 'glob';
import * as path from 'path';
import * as fs from 'fs';
import * as _ from 'lodash';
import { Failure, FailureType, toErrorString } from './failure';
import * as tsutil from './tsutil';
import {
    DirectiveConstraints,
    Directive,
    GroupDirective,
    ErrorDirective,
    ExpectedError,
    ErrorMatching
} from './directives';
import { CheckerSetupError, CheckerFailureError } from './errors';

// TBD: allow using command line tsc
// TBD: verify typescript version against source file directive
// TBD: check whether can test <type>expression without special directive
// TBD: look at adding test labels for any node -- expecting errors or not
// TBD: space-separated params should characterize the same error
// TBD: pretty up CLI output
// TBD: test suite for CLI

export interface CheckerOptions {
    compiler: typeof ts,
    compilerOptions: string | ts.CompilerOptions,
    rootPath?: string,
    allowedErrorMatching?: ErrorMatching // bit flags
}

interface FileMark {
    file: ts.SourceFile; // file being scanned
    relativeFileName: string; // file name relative to root path
    linesRead: number; // number of lines so far read from file
}

class FailureCandidate {

    failure: Failure;
    wasExpected = false;

    constructor(failure: Failure) {
        this.failure = failure;
    }

    at() {
        if (this.failure.at === undefined) {
            // Should never happen.
            throw new Error("Typescript file error lacks a file location"); // fatal error
        }
        return this.failure.at;
    }
}

export class FailChecker implements DirectiveConstraints {

    static readonly DEFAULT_GROUP_NAME = 'Default Group'; // first group when unspecified
    static readonly ERROR_DELIM = "\n"; // delimiting error messages in combined errors

    allowedErrorMatching: ErrorMatching; // bit flags

    protected compiler: typeof ts;
    protected rootPath: string | undefined;
    protected rootRegex: RegExp | null = null;
    protected expectedFileNames: string[] = [];
    protected absoluteFileNames: string[] = [];
    protected relativeFileNames: string[] = [];
    protected compilerOptions: ts.CompilerOptions;
    protected program: ts.Program | undefined; // undefined before run()
    protected directives: Map<string, Directive[]>; // source file => directives
    protected setupErrorMessages: string[] = []; // messages for errors during test setup
    protected failureCandidates: Map<string, FailureCandidate[]>; // source file => source errors
    protected failureIndex: Map<string, Map<string, Failure[]>>; // file => (group name => failures)

    constructor(filePaths: string | string[], options: CheckerOptions) {

        if (typeof filePaths === 'string') {
            filePaths = [ filePaths ];
        }
        if (filePaths.length === 0) {
            throw new Error("FailChecker constructor requires at least one file");
        }

        filePaths.forEach(filePath => {

            if (!path.isAbsolute(filePath)) {
                throw new Error(`Source file path '${filePath}' is not an absolute path`);
            }
            if (!glob.hasMagic(filePath)) {
                this.expectedFileNames.push(filePath);
            }
            glob.sync(filePath).forEach(fileName => {

                this.absoluteFileNames.push(fileName);
            });
        });

        this.compiler = options.compiler;

        if (typeof options.compilerOptions === 'string') {
            this.compilerOptions =
                    tsutil.loadCompilerOptions(this.compiler, options.compilerOptions);
        }
        else {
            this.compilerOptions = options.compilerOptions;
        }

        this.rootPath = options.rootPath;
        if (options.rootPath) {
            let rootPath = options.rootPath;
            if (rootPath.length > 0) {
                if (rootPath[rootPath.length - 1] !== path.sep) {
                    rootPath += path.sep;
                }
                this.rootRegex = new RegExp(_.escapeRegExp(rootPath), 'g');
            }
            this.absoluteFileNames.forEach(absFileName => {

                if (!absFileName.startsWith(rootPath)) {
                    throw new Error(`Source file '${absFileName}' is not in the root path`);
                }
            });
        }

        this.allowedErrorMatching = options.allowedErrorMatching || 0xFF;

        this.directives = new Map<string, Directive[]>();
        this.failureCandidates = new Map<string, FailureCandidate[]>();
        this.failureIndex = new Map<string, Map<string, Failure[]>>();
    }

    run(bailOnFirstError = true) {

        // Load and configure Typescript. Source files not yet parsed.

        this.program = this.compiler.createProgram(this.absoluteFileNames, this.compilerOptions);

        // Confirm that the expected files were found.

        const foundFileNames = this._foundFileNames();
        this.expectedFileNames.forEach(expectedFileName => {

            if (foundFileNames.indexOf(expectedFileName) < 0) {
                this.setupErrorMessages.push(`Source file '${expectedFileName}' not found`);
            }
        });
        if (this.setupErrorMessages.length === 0 && this.absoluteFileNames.length === 0) {
            this.setupErrorMessages.push(`No source files were found to check`);
        }

        // Collect the root-relative file paths.

        foundFileNames.forEach(fileName => {

            this.relativeFileNames.push(tsutil.normalizePaths(this.rootRegex, fileName));
        });

        // Parse the source files and load the errors.

        this._loadErrors(bailOnFirstError);

        // Once parsed, typefail directives can be extracted from the files.

        this._loadDirectives(bailOnFirstError);

        // If we have errors and didn't bail, we must be combining error messages.

        if (this.setupErrorMessages.length > 0) {
            throw new CheckerSetupError(this.setupErrorMessages.join(FailChecker.ERROR_DELIM));
        }
    }
    
    // paths must be either absolute or relative to root path

    files(filePath = '*') {
        return this._filterFiles(filePath).slice();
    }

    *groups(filePath = '*') {
        for (let file of this._filterFiles(filePath)) {
            const fileIndex = this._getFileIndex(file);
            for (let groupName of fileIndex.keys()) {
                yield groupName;
            }
        }
    }

    *failures(filePath = '*', groupName?: string) {
        if (groupName === undefined) {
            for (let file of this._filterFiles(filePath)) {
                const fileIndex = this._getFileIndex(file);
                for (let groupName of fileIndex.keys()) {
                    for (let failure of fileIndex.get(groupName)!) {
                        yield failure;
                    }
                }
            }
        }
        else {
            this._getProgram(); // make sure checker has been run
            filePath = this._normalizePath(filePath);
            const fileIndex = this._getFileIndex(filePath);
            if (fileIndex === undefined) {
                throw new Error(`File '${filePath}' not found`); // fatal error
            }
            const failures = fileIndex.get(groupName);
            if (failures === undefined) {
                throw new Error(`Group '${groupName}' not found in file '${filePath}`);
            }
            for (let failure of failures) {
                yield failure;
            }
        }
    }

    json(spaces?: number) {
        const pojo = { files: <any[]>[] };
        if (spaces === undefined) {
            spaces = 2;
        }

        for (let filePath of this.files()) {
            const normalizedFile = tsutil.normalizePaths(this.rootRegex, filePath);
            const file = { 
                file: normalizedFile,
                groups: <any[]>[]
            };

            for (let groupName of this.groups(filePath)) {
                const group = {
                    group: groupName,
                    failures: <any[]>[]
                };

                for (let failure of this.failures(filePath, groupName)) {
                    let message = failure.message;
                    if (message !== undefined) {
                        message = tsutil.normalizePaths(this.rootRegex, message);
                    }
                    group.failures.push({
                        type: failure.type,
                        at: {
                            fileName: normalizedFile,
                            lineNum: failure.at.lineNum,
                            charNum: failure.at.charNum
                        },
                        code: failure.code,
                        message: message
                    });
                }
                file.groups.push(group);
            }
            pojo.files.push(file);
        }

        return JSON.stringify(pojo, null, spaces);
    }

    throwCombinedError(filePath = '*', groupName?: string) {
        const failures: Failure[] = [];
        // There are more performant solutions, but this is simplest.
        for (let failure of this.failures(filePath, groupName)) {
            failures.push(failure);
        }
        if (failures.length > 0) {
            throw new CheckerFailureError(failures.map(failure => {
                return toErrorString(failure);
            }).join(FailChecker.ERROR_DELIM));
        }
    }

    throwFirstError(filePath = '*', groupName?: string) {
        for (let failure of this.failures(filePath, groupName)) {
            throw new CheckerFailureError(toErrorString(failure), failure.code);
        }
    }

    static findNearestConfigFile(filePaths: string[]) {

        // Validate the file paths.

        if (filePaths.length === 0) {
            throw new Error("No files specified");
        }
        filePaths.forEach(filePath => {

            if (!path.isAbsolute(filePath)) {
                throw new Error("All file paths must be absolute paths");
            }
        });
        const rootPath = path.parse(filePaths[0]).root;
        filePaths.forEach(filePath => {

            // TBD: Not sure how to test this in an OS-independent way.
            if (path.parse(filePath).root !== rootPath) {
                throw new Error("All file paths must share a common root");
            }
        });
        
        // Find the path that is common to all provided paths.

        let commonPath = path.dirname(filePaths[0]);
        for (let i = 1; i < filePaths.length; ++i) {
            while (!commonPath.endsWith(path.sep) && // should work with windows too
                    !filePaths[i].startsWith(commonPath + path.sep))
            {
                commonPath = path.dirname(commonPath);
            }
        }

        // Recursively locate tsconfig.json in a containing directory.

        function _checkForConfigFile(dirPath: string): string | null {
            const tsconfigFile = path.join(dirPath, 'tsconfig.json');
            if (fs.existsSync(tsconfigFile)) {
                return tsconfigFile;
            }
            const parentDirPath = path.dirname(dirPath);
            if (parentDirPath === rootPath) {
                return null;
            }
            return _checkForConfigFile(parentDirPath);
        }

        // Find the nearest tsconfig.json to the common path.

        return _checkForConfigFile(commonPath);
    }

    static toErrorString(failure: Failure) {
        return toErrorString(failure);
    }

    protected _filterFiles(filePath: string) {
        filePath = this._normalizePath(filePath);
        const mm = minimatch.filter(filePath, { matchBase: true });
        const filteredFiles = this.relativeFileNames.filter(mm);
        if (!glob.hasMagic(filePath) && filteredFiles[0] !== filePath) {
            throw new Error(`File '${filePath}' not found in text`);
        }
        return filteredFiles;
    }

    protected _getFileIndex(fileName: string) {

        // Construct failureIndex on demand for files as needed.

        const cachedFileIndex = this.failureIndex.get(fileName);
        if (cachedFileIndex !== undefined) {
            return cachedFileIndex;
        }
        const fileIndex = new Map<string, Failure[]>(); // groups => failures

        // Prepare to determine the failures occurring in each group.

        const fileFailureCandidates = this.failureCandidates.get(fileName) || [];
        let fileDirectives = this.directives.get(fileName);
        let groupExpectedErrors: ExpectedError[] = [];
        let groupCandidateIndex = 0;
        let groupName = FailChecker.DEFAULT_GROUP_NAME;
        let groupStartLineNum = 1;
        let firstGroup = true;

        // Collect failures for all groups of the file but the last.

        if (fileDirectives !== undefined) {
            fileDirectives.forEach(directive => {

                if (directive instanceof GroupDirective) {

                    if (!directive.isFirstNode || !firstGroup) {
                        const { failures, nextGroupCandidateIndex } = this._getGroupFailures(
                            groupExpectedErrors,
                            fileFailureCandidates,
                            groupCandidateIndex,
                            groupStartLineNum,
                            directive.targetLineNum
                        );
                        fileIndex.set(groupName, failures);
                        groupExpectedErrors = [];
                        groupCandidateIndex = nextGroupCandidateIndex;
                    }
                    groupStartLineNum = directive.targetLineNum;
                    groupName = directive.groupName;
                    firstGroup = false;
                }
                else if (directive instanceof ErrorDirective) {
                    directive.addExpectedErrors(groupExpectedErrors);
                }
            });
        }

        // Collect failures for the last group of the file.

        const { failures } = this._getGroupFailures(
            groupExpectedErrors,
            fileFailureCandidates,
            groupCandidateIndex,
            groupStartLineNum,
            Number.MAX_SAFE_INTEGER
        );
        fileIndex.set(groupName, failures);

        // Cache the collected failures and return the file map.

        this.failureIndex.set(fileName, fileIndex);
        return fileIndex;
    }

    protected _getProgram() {
        if (this.program === undefined) {
            throw new Error(`FailChecker has not yet been run`); // fatal error
        }
        return this.program;
    }

    protected _loadDirectives(bailOnFirstError: boolean) {
        const program = this._getProgram();
        const sourceFiles = program.getSourceFiles().filter(file => {
            return (this._foundFileNames().indexOf(file.fileName) >= 0);
        });

        for (let file of sourceFiles) {
            // Count line preceding first LF of file, which may be only line.
            const fileMark = {
                file,
                relativeFileName: tsutil.normalizePaths(this.rootRegex, file.fileName),
                linesRead: 1
            };
            this.compiler.forEachChild(file, child => {

                this._collectDirectives(child, fileMark, bailOnFirstError);
            });
        }
    }

    protected _loadErrors(bailOnFirstError: boolean) {
        const program = this._getProgram();
        let diagnostics = this.compiler.getPreEmitDiagnostics(program);

        diagnostics.forEach(diagnostic => {
            const code = diagnostic.code;
            const rawMessage = this.compiler.flattenDiagnosticMessageText(
                diagnostic.messageText,
                FailChecker.ERROR_DELIM
            );
            const message = tsutil.normalizePaths(this.rootRegex, rawMessage);
            
            if (diagnostic.file) {
                const relativeFileName =
                        tsutil.normalizePaths(this.rootRegex, diagnostic.file.fileName);
                const { line, character } =
                        diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start!);
                const failure = {
                    type: FailureType.UnexpectedError,
                    at: {
                        fileName: relativeFileName,
                        lineNum: line + 1,
                        charNum: character + 1
                    },
                    code,
                    message
                };
                const failureCandidate = new FailureCandidate(failure);
                const failureCandidates = this.failureCandidates.get(relativeFileName) || [];
                failureCandidates.push(<FailureCandidate>failureCandidate);
                if (failureCandidates.length === 1) {
                    this.failureCandidates.set(relativeFileName, failureCandidates);
                }
            }
            else {
                if (bailOnFirstError) {
                    throw new CheckerSetupError(message, code);
                }
                this.setupErrorMessages.push(message);
            }
        });
    }

    protected _normalizePath(filePath: string) {
        if (path.isAbsolute(filePath) && this.rootPath !== undefined) {
            if (!filePath.startsWith(this.rootPath)) {
                throw new Error("Source file path must start with provided root path");
            }
            return tsutil.normalizePaths(this.rootRegex, filePath);
        }
        return filePath;
    }

    protected _foundFileNames() {
        return this._getProgram().getRootFileNames();
    }

    private _collectDirectives(node: ts.Node, fileMark: FileMark, bailOnFirstError: boolean) {

        const file = fileMark.file;
        const relativeFileName = fileMark.relativeFileName;
        const directives = this.directives.get(relativeFileName) || [];
        const nodeText = node.getFullText();
        const isFirstNode = (fileMark.linesRead === 1);
        // Track lines read for determining line numbers of directives.
        fileMark.linesRead += tsutil.countLFs(nodeText, 0);

        const comments = tsutil.getNodeComments(this.compiler, nodeText, fileMark.linesRead);
        if (comments !== null) {
            comments.forEach(comment => {
                let result = Directive.parse(file, relativeFileName, isFirstNode, node,
                        nodeText, comment);
                if (result !== null) {
                    if (result instanceof Directive) {
                        const err = result.validate(this);
                        if (err instanceof CheckerSetupError) {
                            result = err;
                        }
                        else {
                            directives.push(result);
                            if (directives.length === 1) {
                                this.directives.set(relativeFileName, directives);
                            }
                        }
                    }
                    if (result instanceof CheckerSetupError) {
                        if (bailOnFirstError) {
                            throw result;
                        }
                        this.setupErrorMessages.push(result.message);
                    }
                }
            });
        }
    }

    private _getGroupFailures(groupExpectedErrors: ExpectedError[],
            fileFailureCandidates: FailureCandidate[], groupCandidateIndex: number,
            groupStartLineNum: number, nextGroupLineNum: number
    ) {
        // Collect the present group's failure candidates.

        const groupFailureCandidates = <FailureCandidate[]>[];
        let candidateIndex = groupCandidateIndex;
        while (candidateIndex < fileFailureCandidates.length &&
                fileFailureCandidates[candidateIndex].at().lineNum < nextGroupLineNum)
        {
            groupFailureCandidates.push(fileFailureCandidates[candidateIndex++]);
        }

        // Log failures for each target line of code. A target line is a line of
        // code that is either expecting errors or has produced errors. The loop
        // examines each target line separately to report failures in order.

        const failures: Failure[] = []; // of entire group
        let firstCandidateIndex = 0; // of target line
        let expectedErrorIndex = 0; // of groupExpectedErrors

        let { targetLineNum, expectedError, firstFailureCandidate } = this._nextTargetLine(
            groupExpectedErrors, expectedErrorIndex, groupFailureCandidates, firstCandidateIndex);

        while (targetLineNum < nextGroupLineNum) {

            let expectingAtLeastOneError = (expectedError !== null);
            let foundAllExpectedErrors = true;

            // Loop through all errors expected at the current target line,
            // marking the failure candidates that were expected, and logging
            // expected errors not appearing among the failure candidates.

            while (expectedError !== null) {

                // Scan through all of the target line's failure candidates,
                // marking all errors that the present expectedError expected.

                let candidateIndex = firstCandidateIndex; // (re)start for target line
                let failureCandidate = firstFailureCandidate; // (re)start for target line
                let foundExpectedError = false;
                // let failureCandidate = candidateIndex < groupFailureCandidates.length
                //     ? groupFailureCandidates[candidateIndex]
                //     : null;

                while (failureCandidate !== null) {
                    if (expectedError.matches(failureCandidate.failure)) {
                        // mark expected; don't null or delete in case redundant directives
                        failureCandidate.wasExpected = true;
                        foundExpectedError = true;
                        // keep searching in case regex matches more than one error
                    }

                    // Advance to next failure candidate of target line, if any.

                    failureCandidate = null;
                    if (++candidateIndex < groupFailureCandidates.length) {
                        const nextFailureCandidate = groupFailureCandidates[candidateIndex];
                        if (nextFailureCandidate.at().lineNum === targetLineNum) {
                            failureCandidate = nextFailureCandidate;
                        }
                    }
                }

                // If the present expected error wasn't found, that's a test failure.

                if (!foundExpectedError) {
                    foundAllExpectedErrors = false;
                    failures.push(expectedError.toFailure());
                }

                // Advance to next expected error of target line, if any.

                expectedError = null;
                if (++expectedErrorIndex < groupExpectedErrors.length) {
                    const nextExpectedError = groupExpectedErrors[expectedErrorIndex];
                    if (nextExpectedError.directive.targetLineNum === targetLineNum) {
                        expectedError = nextExpectedError;
                    }
                }
            }

            // Log all errors when no errors were expected, and log all
            // unexpected errors when one or more expected errors is missing.
            // When all expected errors are found, additional errors for the
            // current target line are ignored.

            // Scan starts from target line's first failure candidate.
            while (firstCandidateIndex < groupFailureCandidates.length &&
                    groupFailureCandidates[firstCandidateIndex].at().lineNum === targetLineNum
            ) {
                if (!expectingAtLeastOneError || !foundAllExpectedErrors) {
                    const checkedCandidate = groupFailureCandidates[firstCandidateIndex];
                    if (!checkedCandidate.wasExpected) {
                        failures.push(checkedCandidate.failure);
                    }
                }
                ++firstCandidateIndex; // advances until reaching next target line
            }

            // Set next loop iteration to process the next target line.

            ({ targetLineNum, expectedError, firstFailureCandidate } = this._nextTargetLine(
                groupExpectedErrors,
                expectedErrorIndex,
                groupFailureCandidates,
                firstCandidateIndex
            ));
        }

        return {
            failures,
            nextGroupCandidateIndex: groupCandidateIndex + groupFailureCandidates.length
        };
    }

    private _nextTargetLine(
        groupExpectedErrors: ExpectedError[],
        expectedErrorIndex: number,
        groupFailureCandidates: FailureCandidate[],
        candidateIndex: number
    ) {
        let targetLineNum = Number.MAX_SAFE_INTEGER; // assume last group
        let firstFailureCandidate: FailureCandidate | null = null;
        let nextExpectedError: ExpectedError | null = null;

        // If we're expecting an error, default target line to line of that error.

        if (expectedErrorIndex < groupExpectedErrors.length) {
            nextExpectedError = groupExpectedErrors[expectedErrorIndex];
            targetLineNum = nextExpectedError.directive.targetLineNum;
        }

        // If we have an actual error, change target line to line of that error
        // if it precedes the so-far-assumed target line.

        if (candidateIndex < groupFailureCandidates.length) {
            const nextFailureCandidate = groupFailureCandidates[candidateIndex];
            const candidateLineNum = nextFailureCandidate.at().lineNum;
            if (candidateLineNum < targetLineNum) {
                firstFailureCandidate = nextFailureCandidate;
                targetLineNum = candidateLineNum;
                nextExpectedError = null; // directive applies to later target
            }
            else if (candidateLineNum === targetLineNum) {
                firstFailureCandidate = nextFailureCandidate;
            }
        }

        // Having examined the next expected and actual errors, we not only know
        // the next target line, but the next expected and/or actual errors.

        return {
            targetLineNum,
            expectedError: nextExpectedError,
            firstFailureCandidate
        };
    }
}
