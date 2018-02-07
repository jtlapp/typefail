
import * as ts from "typescript";
import * as minimatch from 'minimatch';

// TBD: Allow directives of the form /*[*]* typetest and * typetest
// TBD: detect and error on directives of form typetest/name value (without colon)
// TBD: error on first pass if expected error value has invalid format
// TBD: trim expected error and group name
// TBD: look at adding test labels for any node -- expecting errors or not
// TBD: default load tsconfig.json, searching up dir tree
// TBD: look at having an expect-warning (TS also supports messages)
// TBD: allow confirming of diagnostic codes
// TBD: require exact match errors to be quoted (single or double?)
// TBD: in order to be able to report an invalid directive name, I need a robust directive indicator syntax.

const DIRECTIVE_PREFIX = '@typetest';
const REGEX_DIRECTIVE = new RegExp(`^/{2,}[ ]*${DIRECTIVE_PREFIX}:([^ ]*)(?:: *(.*))?$`, 'i');

const DIRECTIVE_NAME_GROUP = 'group';
const DIRECTIVE_NAME_EXPECT_ERROR = 'expect-error';

const DEFAULT_GROUP_NAME = 'Unnamed TypeTest Group';

interface FileMark {
    file: ts.SourceFile; // file being scanned
    linesRead: number; // number of lines so far read from file
}

interface CommentInfo {
    text: string;
    startIndex: number;
    endIndex: number;
}

class ExpectedError {
    constructor(
        public directive: ExpectErrorDirective,
        public code: number | undefined,
        public message: string | undefined,
        public matches: (failure: Failure) => boolean
    ) { }

    toFailure() {
        return new Failure(FailureType.MissingError, this.code, this.message, {
            fileName: this.directive.fileName,
            lineNum: this.directive.targetLineNum
        });
    }
}

abstract class Directive {
    constructor(
        public targetLineNum: number
    ) { }
}

class GroupDirective extends Directive {
    isFirstNode: boolean;
    name: string;

    constructor(isFirstNode: boolean, targetLineNum: number, name: string) {
        super(targetLineNum);
        this.isFirstNode = isFirstNode;
        this.name = name;
    }
}

class ExpectErrorDirective extends Directive {

    fileName: string;
    pattern: string | undefined;
    expectedErrors: ExpectedError[] = [];

    constructor(
        fileName: string,
        directiveLineNum: number,
        targetLineNum: number,
        pattern: string | undefined
    ) {
        super(targetLineNum);
        this.fileName = fileName;
        if (pattern === undefined) {
            this.expectedErrors.push(new ExpectedError(this, undefined, 'any error',
                (failure) => true));
        }
        else {
            pattern = pattern.trim();
            const matches = pattern.match(/^[/](.+)[/]([imu]+)?$/);
            if (matches !== null) {
                const regex = new RegExp(matches[1], matches[2]);
                this.expectedErrors.push(new ExpectedError(this, undefined, pattern,
                    (failure) => regex.test(failure.message!)));
            }
            else if (/^"(.+)"$/.test(pattern)) {
                const exactMessage = pattern.substr(1, pattern.length - 2);
                this.expectedErrors.push(new ExpectedError(this, undefined, exactMessage,
                    (failure) => failure.message === exactMessage));
            }
            else if (/^\d+(, *\d+)*$/.test(pattern)) {
                const codes = pattern.split(',').map(codeStr => parseInt(codeStr.trim()));
                codes.forEach(code => {
                    this.expectedErrors.push(new ExpectedError(this, code, undefined,
                        (failure => failure.code === code)));
                });
            }
            else {
                const directive = TypeTest._toDirective(DIRECTIVE_NAME_EXPECT_ERROR);
                const location = TypeTest._toFileLocation(this.fileName, this.targetLineNum);
                throw new Error(`Invalid ${directive} directive at ${location}`);
            }
        }
        this.pattern = pattern;
    }

    addExpectedErrors(accumulatedExpectedErrors: ExpectedError[]) {
        this.expectedErrors.forEach(expectedError => {
            accumulatedExpectedErrors.push(expectedError);
        });
    }
}

export enum FailureType {
    UnexpectedError,
    MissingError
}

export interface FileLocation {
    fileName: string;
    lineNum: number;
    charNum?: number;
}

export class Failure {
    constructor(
        public type: FailureType,
        public code?: number,
        public message?: string,
        public at?: FileLocation
    ) { }

    toErrorString() {
        let type: string;
        if (this.type === FailureType.MissingError) {
            type = 'missing error ';
        }
        else {
            type = 'error ';
        }
        const code = (this.code === undefined ? '' : ` TS${this.code}`);
        const message = (this.message === undefined ? '' : `: ${this.message}`);
        const location = (this.at === undefined ? '' : ' at '+
                TypeTest._toFileLocation(this.at.fileName, this.at.lineNum, this.at.charNum));
        return `${type}${code}${message}${location}`;
    }
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

    protected program: ts.Program | undefined; // undefined before run()
    protected directives: Map<string, Directive[]>; // source file => directives
    protected generalErrorReports: ErrorReport[] = []; // failures to begin compilation
    protected sourceErrorReports: Map<string, ErrorReport[]>; // source file => source errors
    protected failureIndex: Map<string, Map<string, Failure[]>>; // file => (group name => failures)

    constructor(public fileNames: string[], public options: ts.CompilerOptions) {
        this.directives = new Map<string, Directive[]>();
        this.sourceErrorReports = new Map<string, ErrorReport[]>();
        this.failureIndex = new Map<string, Map<string, Failure[]>>();
    }

    run(bailOnFirstError = false) {
        this.program = ts.createProgram(this.fileNames, this.options);
        // Must load errors first because compilers loads data on demand.
        this._loadErrors(bailOnFirstError);
        this._loadDirectives();
        if (this.generalErrorReports.length > 0) {
            const failures = this.generalErrorReports.map(report => report.failureCandidate);
            throw TypeTest._combinedError(failures);
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
            for (let file of this.groups(filePath)) {
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
            throw TypeTest._combinedError(failures);
        }
    }

    throwFirstError(filePath = '*', groupName?: string) {
        for (let error of this.failures(filePath, groupName)) {
            throw error;
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
        let groupName = DEFAULT_GROUP_NAME;

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
                        message, { fileName, lineNum: line, charNum: character }));
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

    private _collectDirective(file: ts.SourceFile, isFirstNode: boolean, node: ts.Node,
            directiveLineNum: number, name: string, value: string
    ) {
        name = name.toLowerCase(); // directives are not case sensitive
        const targetLineNum = file.getLineAndCharacterOfPosition(node.getStart()).line;
        let directive: Directive;

        switch (name) {
            case DIRECTIVE_NAME_GROUP:
            if (value === '') {
                throw new Error(`'${TypeTest._toDirective(name)}' directive missing group name `+
                        `at ${TypeTest._toFileLocation(file.fileName, directiveLineNum)}`);
            }
            directive = new GroupDirective(isFirstNode, targetLineNum, value);
            break;

            case DIRECTIVE_NAME_EXPECT_ERROR:
            directive = new ExpectErrorDirective(file.fileName, directiveLineNum,
                    targetLineNum, value);
            break;

            default:
            if (name === '') {
                throw new Error(`Directive must have the form `+
                        `'${TypeTest._toDirective('<name>')}.`);
            }
            throw new Error(`Invalid directive '${TypeTest._toDirective(name)}'.`);
        }

        const directives = this.directives.get(file.fileName) || [];
        directives.push(directive);
        if (directives.length === 1) {
            this.directives.set(file.fileName, directives);
        }
    }

    private _collectDirectives(node: ts.Node, fileMark: FileMark) {

        // Track lines read to determine line numbers of directives.
        const nodeText = node.getFullText();
        // Start at offset 1 to skip LF ending last read line.
        fileMark.linesRead += TypeTest._countLFs(nodeText, 0);
        console.log(`KIND ${ts.SyntaxKind[node.kind]}`);

        const comments = this._getNodeComments(nodeText);
        if (comments !== null) {
            comments.forEach(comment => {
                const matches = comment.text.match(REGEX_DIRECTIVE);
                if (matches !== null) {
                    const isFirstNode = (fileMark.linesRead === 1);
                    const lineNum = fileMark.linesRead -
                            TypeTest._countLFs(nodeText, comment.endIndex);
                    this._collectDirective(fileMark.file, isFirstNode, node, lineNum,
                            matches[1], matches[2]);
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

    private _getNodeComments(nodeText: string): CommentInfo[] | null {
        const commentRanges = ts.getLeadingCommentRanges(nodeText, 0);

        if (commentRanges == null || commentRanges.length === 0) {
            return null;
        }
        return commentRanges.map(range => {
            return {
                text: nodeText.substring(range.pos, range.end),
                startIndex: range.pos,
                endIndex: range.end
            };
        });
    }

    static _combinedError(failures: Failure[]) {
        return new Error(failures.map(failure => failure.toErrorString()).join("\n"));
    }

    static _toDirective(name: string) {
        return `${DIRECTIVE_PREFIX}:${name}`;
    }

    static _toFileLocation(fileName: string, lineNum: number, charNum?: number) {
        if (charNum === undefined) {
            return `${fileName}:${lineNum}`;
        }
        return `${fileName}:${lineNum}:${charNum}`;
    }

    static _countLFs(text: string, nextIndex: number) {
        let count = 0;
        while ((nextIndex = text.indexOf('\n', nextIndex) + 1) > 0) {
            ++count;
        }
        return count;
    }
}

const test = new TypeTest(process.argv.slice(2), {
    noEmitOnError: true,
    noImplicitAny: true,
    target: ts.ScriptTarget.ES5,
    module: ts.ModuleKind.CommonJS
});
test.run();

for (let failure of test.failures()) {
    console.log(failure.toErrorString());
}
