
import * as ts from "typescript";
import * as minimatch from 'minimatch';
import * as tsutil from './tsutil';
import { FailureType, Failure } from './failure';
import { Directive, GroupDirective, ExpectErrorDirective, ExpectedError } from './directives';

// TBD: Allow directives of the form /*[*]* typetest and * typetest
// TBD: error on first pass if expected error value has invalid format
// TBD: look at adding test labels for any node -- expecting errors or not
// TBD: default load tsconfig.json, searching up dir tree
// TBD: look at having an expect-warning (TS also supports messages)
// TBD: in order to be able to report an invalid directive name, I need a robust directive indicator syntax.
// TBD: option to permit only certain expected error syntaxes

export const DIRECTIVE_SYNTAX_REGEX =
        new RegExp(`^/{2,}[ ]*${Directive.DIRECTIVE_PREFIX}:([^ ]*)(?:: *(.*))?$`, 'i');

export interface TypeTestOptions {
    compilerOptions: string | ts.CompilerOptions // TBD: make optional
}

interface FileMark {
    file: ts.SourceFile; // file being scanned
    linesRead: number; // number of lines so far read from file
}

class ErrorReport {

    failureCandidate: Failure;
    wasExpected = false;

    constructor(failureCandidate: Failure) {
        this.failureCandidate = failureCandidate;
    }

    at() {
        if (this.failureCandidate.at === undefined) {
            throw new Error("Typescript file error lacks a file location");
        }
        return this.failureCandidate.at;
    }

    toError() {
        return new Error(this.failureCandidate.toErrorString());
    }
}

export class TypeTest {

    protected compilerOptions: ts.CompilerOptions;
    protected program: ts.Program | undefined; // undefined before run()
    protected directives: Map<string, Directive[]>; // source file => directives
    protected generalErrorReports: ErrorReport[] = []; // failures to begin compilation
    protected sourceErrorReports: Map<string, ErrorReport[]>; // source file => source errors
    protected failureIndex: Map<string, Map<string, Failure[]>>; // file => (group name => failures)

    constructor(public fileNames: string[], public options: TypeTestOptions) {
        this.directives = new Map<string, Directive[]>();
        this.sourceErrorReports = new Map<string, ErrorReport[]>();
        this.failureIndex = new Map<string, Map<string, Failure[]>>();
        if (typeof options.compilerOptions === 'string') {
            this.compilerOptions = tsutil.loadCompilerOptions(options.compilerOptions);
        }
        else {
            this.compilerOptions = options.compilerOptions;
        }
    }

    run(bailOnFirstError = false) {
        this.program = ts.createProgram(this.fileNames, this.compilerOptions);
        // Must load errors first because compilers loads data on demand.
        this._loadErrors(bailOnFirstError);
        this._loadDirectives();
        if (this.generalErrorReports.length > 0) {
            const failures = this.generalErrorReports.map(report => report.failureCandidate);
            throw Failure.combinedError(failures);
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
                throw new Error(`File '${filePath}' not found`);
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
            throw Failure.combinedError(failures);
        }
    }

    throwFirstError(filePath = '*', groupName?: string) {
        for (let failure of this.failures(filePath, groupName)) {
            throw new Error(failure.toErrorString());
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

        const fileErrorReports = this.sourceErrorReports.get(fileName) || [];
        let fileDirectives = this.directives.get(fileName);
        let groupExpectedErrors: ExpectedError[] = [];
        let reportIndex = 0;
        let groupName = GroupDirective.DEFAULT_GROUP_NAME;

        // Collect failures for all groups of the file but the last.

        if (fileDirectives !== undefined) {
            fileDirectives.forEach(directive => {

                if (directive instanceof GroupDirective) {

                    if (!directive.isFirstNode) {
                        const { failures, nextReportIndex } = this._getGroupFailures(
                                    groupExpectedErrors, fileErrorReports,
                                    reportIndex, directive.targetLineNum);
                        fileIndex.set(groupName, failures);
                        groupExpectedErrors = [];
                        reportIndex = nextReportIndex;
                    }
                    groupName = directive.name;
                }
                else if (directive instanceof ExpectErrorDirective) {
                    directive.addExpectedErrors(groupExpectedErrors);
                }
            });
        }

        // Collect failures for the last group of the file.

        const { failures } = this._getGroupFailures(groupExpectedErrors,
                fileErrorReports, reportIndex, Number.MAX_SAFE_INTEGER);
        fileIndex.set(groupName, failures);

        // Cache the collected failures and return the file map.

        this.failureIndex.set(fileName, fileIndex);
        return fileIndex;
    }

    protected _getProgram() {
        if (this.program === undefined) {
            throw new Error(`Test has not yet been run`);
        }
        return this.program;
    }

    protected _loadDirectives() {
        const program = this._getProgram();
        const sourceFiles = program.getSourceFiles().filter(file => {
            return (this._testFileNames().indexOf(file.fileName) >= 0);
        });

        for (let file of sourceFiles) {
            // Count line preceding first LF of file, which may be only line.
            const fileMark = { file, linesRead: 1 };
            ts.forEachChild(file, child => {

                this._collectDirectives(child, fileMark);
            });
        }
    }

    protected _loadErrors(bailOnFirstError: boolean) {
        const program = this._getProgram();
        let diagnostics = ts.getPreEmitDiagnostics(program);

        diagnostics.forEach(diagnostic => {
            const code = diagnostic.code;
            const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
            let errorReport: ErrorReport;
            if (diagnostic.file) {
                const fileName = diagnostic.file.fileName;
                const { line, character } =
                        diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start!);
                // For now, assume all errors are unexpected.
                errorReport = new ErrorReport(new Failure(FailureType.UnexpectedError, code,
                        message, { fileName, lineNum: line + 1, charNum: character + 1 }));
                const errorReports = this.sourceErrorReports.get(fileName) || [];
                errorReports.push(<ErrorReport>errorReport);
                if (errorReports.length === 1) {
                    this.sourceErrorReports.set(fileName, errorReports);
                }
            }
            else {
                errorReport = new ErrorReport(new Failure(FailureType.UnexpectedError,
                        code, message));
                this.generalErrorReports.push(errorReport);
            }
            if (bailOnFirstError) {
                throw errorReport.toError();
            }
        });
    }

    protected _testFileNames() {
        return this._getProgram().getRootFileNames();
    }

    private _collectDirectives(node: ts.Node, fileMark: FileMark) {

        const file = fileMark.file;
        const directives = this.directives.get(file.fileName) || [];
        // Track lines read to determine line numbers of directives.
        const nodeText = node.getFullText();
        // Start at offset 1 to skip LF ending last read line.
        fileMark.linesRead += tsutil.countLFs(nodeText, 0);

        const comments = tsutil.getNodeComments(nodeText);
        if (comments !== null) {
            comments.forEach(comment => {
                const matches = comment.text.match(DIRECTIVE_SYNTAX_REGEX);
                if (matches !== null) {
                    const isFirstNode = (fileMark.linesRead === 1);
                    const lineNum = fileMark.linesRead -
                            tsutil.countLFs(nodeText, comment.endIndex);
                    const directive = Directive.create(file, isFirstNode, node,
                            lineNum, matches[1].trim(), matches[2].trim());
                    directives.push(directive);
                    if (directives.length === 1) {
                        this.directives.set(file.fileName, directives);
                    }
                }
            });
        }
    }

    private _getGroupFailures(expectedErrors: ExpectedError[],
            fileErrorReports: ErrorReport[], reportIndex: number,
            nextGroupLineNum: number
    ) {
        const failures: Failure[] = [];
        const groupErrorReports: ErrorReport[] =
            fileErrorReports.filter(report => report.at().lineNum < nextGroupLineNum);
        const nextReportIndex = reportIndex + groupErrorReports.length;
        reportIndex = 0; // repurpose for groupErrorReports
        let expectedErrorIndex = 0;

        // Log failures for each target line of code. A target line is a line of
        // code that is either expecting errors or has produced errors. The loop
        // examines each target line separately so that all failures are always
        // reported in the order in which they occur.

        while(true) {

            // Determine the next target line number and its associated values.

            let targetLineNum = Number.MAX_SAFE_INTEGER; // assume last group
            let errorReport: ErrorReport | null = null; // at targetlineNum
            let expectedError: ExpectedError | null = null; // at targetLineNum

            if (expectedErrorIndex < expectedErrors.length) {
                expectedError = expectedErrors[expectedErrorIndex];
                targetLineNum = expectedError.directive.targetLineNum;
            }
            if (reportIndex < groupErrorReports.length) {
                const reportLineNum = groupErrorReports[reportIndex]!.at().lineNum;
                if (reportLineNum < targetLineNum) {
                    errorReport = groupErrorReports[reportIndex];
                    targetLineNum = reportLineNum;
                    expectedError = null; // directive applies to later target
                }
                else if (reportLineNum === targetLineNum) {
                    errorReport = groupErrorReports[reportIndex];
                }
            }

            // Exit loop when the next target line follows the current group.

            if (targetLineNum >= nextGroupLineNum) {
                break;
            }

            // For the current target line number, mark all reports of errors
            // that were expected and log expected errors that are missing.

            let expectingAtLeastOneError = (expectedError !== null);
            let foundAllExpectedErrors = true;

            while (expectedError !== null) {
                let targetReportIndex = reportIndex; // restart scan of error reports
                while (errorReport !== null) {
                    if (expectedError.matches(errorReport.failureCandidate)) {
                        // mark expected; don't null or delete in case redundant directives
                        groupErrorReports[targetReportIndex].wasExpected = true;
                    }
                    else {
                        foundAllExpectedErrors = false;
                        failures.push(expectedError.toFailure());
                    }
                    errorReport = null; // advance to next error report of target line, if any
                    if (++targetReportIndex < groupErrorReports.length &&
                            groupErrorReports[targetReportIndex].at().lineNum === targetLineNum
                    ) {
                        errorReport = groupErrorReports[targetReportIndex];
                    }
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
                // Scan starts from target line's first error report.
                while (reportIndex < groupErrorReports.length &&
                        groupErrorReports[reportIndex].at().lineNum === targetLineNum
                ) {
                    const checkedErrorReport = groupErrorReports[reportIndex];
                    if (!checkedErrorReport.wasExpected) {
                        failures.push(checkedErrorReport.failureCandidate);
                    }
                    ++reportIndex; // advances until reaching next target line
                }
            }
        }
        return { failures, nextReportIndex };
    }
}
