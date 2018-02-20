
import * as ts from "typescript";
import * as minimatch from 'minimatch';
import * as glob from 'glob';
import * as path from 'path';
import * as _ from 'lodash';
import * as tsutil from './tsutil';
import {
    DirectiveConstraints,
    Directive,
    GroupDirective,
    ExpectErrorDirective,
    ExpectedError,
    ErrorMatching
} from './directives';
import { Failure, RootedFailure } from './failure';
import { TestSetupError, TestFailureError } from './errors';

// TBD: look at adding test labels for any node -- expecting errors or not
// TBD: default load tsconfig.json, searching up dir tree (command line tool)
// TBD: space-separated params should characterize the same error
// TBD: maybe change 'expect-error' to 'errors'
// TBD: look at simplifying code by indexing on root-relative filenames

export interface TypeTestOptions {
    compilerOptions: string | ts.CompilerOptions,
    rootPath?: string,
    allowedErrorMatching?: ErrorMatching // bit flags
}

export const DEFAULT_GROUP_NAME = 'Default Group';

const ERROR_DELIM = "\n"; // delimiting error messages in combined errors

interface FileMark {
    file: ts.SourceFile; // file being scanned
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

export class TypeTest implements DirectiveConstraints {

    allowedErrorMatching: ErrorMatching; // bit flags

    protected rootPath: string | undefined;
    protected rootRegex: RegExp | null = null;
    protected expectedFileNames: string[] = [];
    protected absoluteFileNames: string[] = [];
    protected options: TypeTestOptions;
    protected compilerOptions: ts.CompilerOptions;
    protected program: ts.Program | undefined; // undefined before run()
    protected directives: Map<string, Directive[]>; // source file => directives
    protected setupErrorMessages: string[] = []; // messages for errors during test setup
    protected failureCandidates: Map<string, FailureCandidate[]>; // source file => source errors
    protected failureIndex: Map<string, Map<string, Failure[]>>; // file => (group name => failures)

    constructor(filePaths: string | string[], options: TypeTestOptions) {

        if (typeof filePaths === 'string') {
            filePaths = [ filePaths ];
        }
        if (filePaths.length === 0) {
            throw new Error("TypeType constructor requires at least one file");
        }
        filePaths.forEach(filePath => {

            if (!glob.hasMagic(filePath)) {
                this.expectedFileNames.push(filePath);
            }
            glob.sync(filePath).forEach(fileName => {

                this.absoluteFileNames.push(fileName);
            });
        });
        this.options = options;

        if (typeof options.compilerOptions === 'string') {
            this.compilerOptions = tsutil.loadCompilerOptions(options.compilerOptions);
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
        }

        this.allowedErrorMatching = options.allowedErrorMatching || 0xFF;

        this.directives = new Map<string, Directive[]>();
        this.failureCandidates = new Map<string, FailureCandidate[]>();
        this.failureIndex = new Map<string, Map<string, Failure[]>>();
    }

    run(bailOnFirstError = true) {

        // Load and configure Typescript. Source files not yet parsed.

        this.program = ts.createProgram(this.absoluteFileNames, this.compilerOptions);

        // Confirm that the expected files were found.

        const foundFileNames = this._foundFileNames();
        this.expectedFileNames.forEach(expectedFileName => {

            if (foundFileNames.indexOf(expectedFileName) < 0) {
                this.setupErrorMessages.push(`Source file '${expectedFileName}' not found`);
            }
        });
        if (this.setupErrorMessages.length === 0 && this.absoluteFileNames.length === 0) {
            this.setupErrorMessages.push(`No source files were found to test`);
        }

        // Parse the source files and load the errors.

        this._loadErrors(bailOnFirstError);

        // Once parsed, typetest directives can be extracted from the files.

        this._loadDirectives(bailOnFirstError);

        // If we have errors and didn't bail, we must be combining error messages.

        if (this.setupErrorMessages.length > 0) {
            throw new TestSetupError(this.setupErrorMessages.join(ERROR_DELIM));
        }
    }
    
    // paths must be specified relative to the root path, if there is one;
    // empty string selects all files regardless of root path

    files(filePath = '') {
        return this._absoluteFiles(filePath).map(fileName => {
            return tsutil.normalizePaths(this.rootRegex, fileName);
        });
    }

    *groups(filePath = '') {
        for (let file of this._absoluteFiles(filePath)) {
            const fileIndex = this._getFileIndex(file);
            for (let groupName of fileIndex.keys()) {
                yield groupName;
            }
        }
    }

    *failures(filePath = '', groupName?: string) {
        if (groupName === undefined) {
            for (let file of this._absoluteFiles(filePath)) {
                const fileIndex = this._getFileIndex(file);
                for (let groupName of fileIndex.keys()) {
                    for (let failure of fileIndex.get(groupName)!) {
                        yield failure;
                    }
                }
            }
        }
        else {
            this._getProgram(); // make sure test has been run
            filePath = this._toAbsoluteFile(filePath);
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

    throwCombinedError(filePath = '', groupName?: string) {
        const failures: Failure[] = [];
        // There are more performant solutions, but this is simplest.
        for (let failure of this.failures(filePath, groupName)) {
            failures.push(failure);
        }
        if (failures.length > 0) {
            throw new TestFailureError(failures.map(failure => {
                return failure.toErrorString();
            }).join(ERROR_DELIM));
        }
    }

    throwFirstError(filePath = '', groupName?: string) {
        for (let failure of this.failures(filePath, groupName)) {
            throw new TestFailureError(failure.toErrorString(), failure.code);
        }
    }

    protected _absoluteFiles(filePath: string) {
        filePath = this._toAbsoluteFile(filePath);
        const mm = minimatch.filter(filePath, { matchBase: true });
        return this._foundFileNames().filter(mm);
    }

    protected _getFileIndex(fileName: string) {

        // Construct failureIndex on demand for files as needed.

        const cachedFileIndex = this.failureIndex.get(fileName);
        if (cachedFileIndex !== undefined) {
            return cachedFileIndex;
        }
        const fileIndex = new Map<string, Failure[]>();

        // Prepare to determine the failures occurring in each group.

        const fileFailureCandidates = this.failureCandidates.get(fileName) || [];
        let fileDirectives = this.directives.get(fileName);
        let groupExpectedErrors: ExpectedError[] = [];
        let groupCandidateIndex = 0;
        let groupName = DEFAULT_GROUP_NAME;
        let groupStartLineNum = 1;

        // Collect failures for all groups of the file but the last.

        if (fileDirectives !== undefined) {
            fileDirectives.forEach(directive => {

                if (directive instanceof GroupDirective) {

                    if (!directive.isFirstNode) {
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
                }
                else if (directive instanceof ExpectErrorDirective) {
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
            throw new Error(`TypeTest has not yet been run`); // fatal error
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
            const fileMark = { file, linesRead: 1 };
            ts.forEachChild(file, child => {

                this._collectDirectives(child, fileMark, bailOnFirstError);
            });
        }
    }

    protected _loadErrors(bailOnFirstError: boolean) {
        const program = this._getProgram();
        let diagnostics = ts.getPreEmitDiagnostics(program);

        diagnostics.forEach(diagnostic => {
            const code = diagnostic.code;
            const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, ERROR_DELIM);
            if (diagnostic.file) {
                const fileName = diagnostic.file.fileName;
                const { line, character } =
                        diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start!);
                const failure = new RootedFailure(
                    this.rootRegex,
                    tsutil.FailureType.UnexpectedError,
                    { fileName, lineNum: line + 1, charNum: character + 1 },
                    code,
                    message
                );
                const failureCandidate = new FailureCandidate(failure);
                const failureCandidates = this.failureCandidates.get(fileName) || [];
                failureCandidates.push(<FailureCandidate>failureCandidate);
                if (failureCandidates.length === 1) {
                    this.failureCandidates.set(fileName, failureCandidates);
                }
            }
            else {
                if (bailOnFirstError) {
                    throw new TestSetupError(message, code);
                }
                this.setupErrorMessages.push(message);
            }
        });
    }

    protected _foundFileNames() {
        return this._getProgram().getRootFileNames();
    }

    private _collectDirectives(node: ts.Node, fileMark: FileMark, bailOnFirstError: boolean) {

        const file = fileMark.file;
        const directives = this.directives.get(file.fileName) || [];
        const nodeText = node.getFullText();
        const isFirstNode = (fileMark.linesRead === 1);
        // Track lines read for determining line numbers of directives.
        fileMark.linesRead += tsutil.countLFs(nodeText, 0);

        const comments = tsutil.getNodeComments(nodeText, fileMark.linesRead);
        if (comments !== null) {
            comments.forEach(comment => {
                let result = Directive.parse(this.rootRegex, file, isFirstNode, node, nodeText,
                        comment);
                if (result !== null) {
                    if (result instanceof Directive) {
                        const err = result.validate(this);
                        if (err instanceof TestSetupError) {
                            result = err;
                        }
                        else {
                            directives.push(result);
                            if (directives.length === 1) {
                                this.directives.set(file.fileName, directives);
                            }
                        }
                    }
                    if (result instanceof TestSetupError) {
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

    private _toAbsoluteFile(filePath: string) {
        if (filePath === '') {
            return '*';
        }
        if (filePath[0] !== path.sep && this.rootPath !== undefined) {
            return path.join(this.rootPath, filePath);
        }
        return filePath;
    }
}
