
import * as ts from "typescript";
import * as minimatch from 'minimatch';
import * as tsutil from './tsutil';
import { Directive, GroupDirective, ExpectErrorDirective, ExpectedError } from './directives';
import { FailureType, Failure } from './failure';
import { TestSetupError, TestFailureError } from './errors';

// TBD: add support for directives of the form /* directive */
// TBD: error on first pass if expected error value has invalid format
// TBD: look at adding test labels for any node -- expecting errors or not
// TBD: default load tsconfig.json, searching up dir tree (command line tool)
// TBD: in order to be able to report an invalid directive name, I need a robust directive indicator syntax.
// TBD: option to permit only certain expected error syntaxes
// TBD: add style option regex that each directive comment must match

export interface TypeTestOptions {
    compilerOptions: string | ts.CompilerOptions // TBD: make optional
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

export class TypeTest {

    protected compilerOptions: ts.CompilerOptions;
    protected program: ts.Program | undefined; // undefined before run()
    protected directives: Map<string, Directive[]>; // source file => directives
    protected setupErrorMessages: string[] = []; // messages for errors during test setup
    protected failureCandidates: Map<string, FailureCandidate[]>; // source file => source errors
    protected failureIndex: Map<string, Map<string, Failure[]>>; // file => (group name => failures)

    constructor(public fileNames: string[], public options: TypeTestOptions) {
        this.directives = new Map<string, Directive[]>();
        this.failureCandidates = new Map<string, FailureCandidate[]>();
        this.failureIndex = new Map<string, Map<string, Failure[]>>();
        if (typeof options.compilerOptions === 'string') {
            this.compilerOptions = tsutil.loadCompilerOptions(options.compilerOptions);
        }
        else {
            this.compilerOptions = options.compilerOptions;
        }
    }

    run(bailOnFirstError = true) {
        this.program = ts.createProgram(this.fileNames, this.compilerOptions);
        // Must load errors first because compilers loads data on demand.
        this._loadErrors(bailOnFirstError);
        this._loadDirectives(bailOnFirstError);
        // If we have errors and didn't bail, we must be combining error messages.
        if (this.setupErrorMessages.length > 0) {
            throw new TestSetupError(this.setupErrorMessages.join(ERROR_DELIM));
        }
    }

    files(filePath = '*') {
        const mm = minimatch.filter(filePath, { matchBase: true });
        return this._testFileNames().filter(mm);
    }

    *groups(filePath = '*') {
        for (let file of this.files(filePath)) {
            const fileIndex = this._getFileIndex(file);
            for (let groupName of fileIndex.keys()) {
                yield groupName;
            }
        }
    }

    *failures(filePath = '*', groupName?: string) {
        if (groupName === undefined) {
            for (let file of this.files(filePath)) {
                const fileIndex = this._getFileIndex(file);
                for (let groupName of fileIndex.keys()) {
                    for (let failure of fileIndex.get(groupName)!) {
                        yield failure;
                    }
                }
            }
        }
        else {
            const fileIndex = this._getFileIndex(filePath);
            if (fileIndex === undefined) {
                throw new Error(`File '${filePath}' not found`); // fatal error
            }
            for (let groupName of fileIndex.keys()) {
                for (let failure of fileIndex.get(groupName)!) {
                    yield failure;
                }
            }
        }
    }

    throwCombinedError(filePath = '*', groupName?: string) {
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

    throwFirstError(filePath = '*', groupName?: string) {
        for (let failure of this.failures(filePath, groupName)) {
            throw new TestFailureError(failure.toErrorString(), failure.code);
        }
    }

    protected _getFileIndex(fileName: string) {

        // Construct failureIndex on demand only as far as needed.

        const cachedFileIndex = this.failureIndex.get(fileName);
        if (cachedFileIndex !== undefined) {
            return cachedFileIndex;
        }
        const fileIndex = new Map<string, Failure[]>();

        // Prepare to determine the failures occurring in each group.

        const fileFailureCandidates = this.failureCandidates.get(fileName) || [];
        let fileDirectives = this.directives.get(fileName);
        let groupExpectedErrors: ExpectedError[] = [];
        let candidateIndex = 0;
        let groupName = DEFAULT_GROUP_NAME;

        // Collect failures for all groups of the file but the last.

        if (fileDirectives !== undefined) {
            fileDirectives.forEach(directive => {

                if (directive instanceof GroupDirective) {

                    if (!directive.isFirstNode) {
                        const { failures, nextCandidateIndex } = this._getGroupFailures(
                            groupExpectedErrors,
                            fileFailureCandidates,
                            candidateIndex,
                            directive.targetLineNum
                        );
                        fileIndex.set(groupName, failures);
                        groupExpectedErrors = [];
                        candidateIndex = nextCandidateIndex;
                    }
                    groupName = directive.groupName;
                }
                else if (directive instanceof ExpectErrorDirective) {
                    directive.addExpectedErrors(groupExpectedErrors);
                }
            });
        }

        // Collect failures for the last group of the file.

        const { failures } = this._getGroupFailures(groupExpectedErrors,
                fileFailureCandidates, candidateIndex, Number.MAX_SAFE_INTEGER);
        fileIndex.set(groupName, failures);

        // Cache the collected failures and return the file map.

        this.failureIndex.set(fileName, fileIndex);
        return fileIndex;
    }

    protected _getProgram() {
        if (this.program === undefined) {
            throw new Error(`Test has not yet been run`); // fatal error
        }
        return this.program;
    }

    protected _loadDirectives(bailOnFirstError: boolean) {
        const program = this._getProgram();
        const sourceFiles = program.getSourceFiles().filter(file => {
            return (this._testFileNames().indexOf(file.fileName) >= 0);
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
                const failure = new Failure(
                    FailureType.UnexpectedError,
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

    protected _testFileNames() {
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
                const result = Directive.parse(file, isFirstNode, node, nodeText, comment);
                if (result !== null) {
                    if (result instanceof Directive) {
                        directives.push(result);
                        if (directives.length === 1) {
                            this.directives.set(file.fileName, directives);
                        }
                    }
                    else { // result is a TestSetupError
                        if (bailOnFirstError) {
                            throw result;
                        }
                        this.setupErrorMessages.push(result.message);
                    }
                }
            });
        }
    }

    private _getGroupFailures(expectedErrors: ExpectedError[],
            fileFailureCandidates: FailureCandidate[], candidateIndex: number,
            nextGroupLineNum: number
    ) {
        const failures: Failure[] = [];
        const groupFailureCandidates: FailureCandidate[] =
            fileFailureCandidates.filter(candidate => candidate.at().lineNum < nextGroupLineNum);
        const nextCandidateIndex = candidateIndex + groupFailureCandidates.length;
        candidateIndex = 0; // repurpose for groupFailureCandidates
        let expectedErrorIndex = 0;

        // Log failures for each target line of code. A target line is a line of
        // code that is either expecting errors or has produced errors. The loop
        // examines each target line separately so that all failures are always
        // reported in the order in which they occur.

        while(true) {

            // Determine the next target line number and its associated values.

            let targetLineNum = Number.MAX_SAFE_INTEGER; // assume last group
            let failureCandidate: FailureCandidate | null = null; // at targetlineNum
            let expectedError: ExpectedError | null = null; // at targetLineNum

            if (expectedErrorIndex < expectedErrors.length) {
                expectedError = expectedErrors[expectedErrorIndex];
                targetLineNum = expectedError.directive.targetLineNum;
            }
            if (candidateIndex < groupFailureCandidates.length) {
                const candidateLineNum = groupFailureCandidates[candidateIndex]!.at().lineNum;
                if (candidateLineNum < targetLineNum) {
                    failureCandidate = groupFailureCandidates[candidateIndex];
                    targetLineNum = candidateLineNum;
                    expectedError = null; // directive applies to later target
                }
                else if (candidateLineNum === targetLineNum) {
                    failureCandidate = groupFailureCandidates[candidateIndex];
                }
            }

            // Exit loop when the next target line follows the current group.

            if (targetLineNum >= nextGroupLineNum) {
                break;
            }

            // For the current target line number, mark all failure candidates
            // that were expected and log expected errors that are missing.

            let expectingAtLeastOneError = (expectedError !== null);
            let foundAllExpectedErrors = true;

            while (expectedError !== null) {
                let targetCandidateIndex = candidateIndex; // restart scan of failure candidates
                let foundExpectedError = false;
                while (failureCandidate !== null) {
                    if (expectedError.matches(failureCandidate.failure)) {
                        // mark expected; don't null or delete in case redundant directives
                        groupFailureCandidates[targetCandidateIndex].wasExpected = true;
                        foundExpectedError = true;
                    }
                    failureCandidate = null; // advance to next failure candidate of target line
                    if (++targetCandidateIndex < groupFailureCandidates.length &&
                            groupFailureCandidates[targetCandidateIndex].at().lineNum ===
                                    targetLineNum
                    ) {
                        failureCandidate = groupFailureCandidates[targetCandidateIndex];
                    }
                }
                if (!foundExpectedError) {
                    foundAllExpectedErrors = false;
                    failures.push(expectedError.toFailure());
                }
                expectedError = null; // advance to next expected error of target line, if any
                if (++expectedErrorIndex < expectedErrors.length &&
                        expectedErrors[expectedErrorIndex].directive.targetLineNum === targetLineNum
                ) {
                    expectedError = expectedErrors[expectedErrorIndex];
                }
            }

            // Log all errors when no errors were expected, and log all
            // unexpected errors when one or more expected errors is missing.
            // When all expected errors are found, additional errors for the
            // current target line are ignored.

            if (!expectingAtLeastOneError || !foundAllExpectedErrors) {
                // Scan starts from target line's first failure candidate.
                while (candidateIndex < groupFailureCandidates.length &&
                        groupFailureCandidates[candidateIndex].at().lineNum === targetLineNum
                ) {
                    const checkedCandidate = groupFailureCandidates[candidateIndex];
                    if (!checkedCandidate.wasExpected) {
                        failures.push(checkedCandidate.failure);
                    }
                    ++candidateIndex; // advances until reaching next target line
                }
            }
        }
        return { failures, nextCandidateIndex };
    }
}
