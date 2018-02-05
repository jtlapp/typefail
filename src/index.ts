
import * as ts from "typescript";
import * as minimatch from 'minimatch';

// TBD: Allow directives of the form /*[*]* typetest and * typetest
// TBD: detect and error on directives of form typetest/name value (without colon)
// TBD: error on first pass if expected error value has invalid format
// TBD: trim expected error and group name

const DIRECTIVE_PREFIX = 'typetest';
const REGEX_DIRECTIVE = new RegExp(`^/{2,}[ ]*${DIRECTIVE_PREFIX}/([^ ]*)(?:: *(.*))?$`, 'i');

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

abstract class Directive {
    constructor(
        public blockLineNum: number,
        public directiveLineNum: number,
        public targetLineNum: number
    ) { }
}

class GroupDirective extends Directive {
    constructor(
        blockLineNum: number,
        directiveLineNum: number,
        targetLineNum: number,
        public name: string
    ) {
        super(blockLineNum, directiveLineNum, targetLineNum);
    }
}

class ExpectErrorDirective extends Directive {

    pattern: string | undefined;
    regex: RegExp | undefined;

    constructor(
        public fileName: string,
        blockLineNum: number,
        directiveLineNum: number,
        targetLineNum: number,
        pattern: string | undefined
    ) {
        super(blockLineNum, directiveLineNum, targetLineNum);
        if (pattern !== undefined && pattern[0] === '/') {
            pattern = pattern.substr(1, pattern.length - 2);
            this.regex = new RegExp(pattern);
        }
        this.pattern = pattern;
    }

    matches(message: string) {
        if (this.pattern === undefined) {
            return true;
        }
        else if (this.regex !== undefined) {
            return message.match(this.regex);
        }
        return message === this.pattern;
    }

    toError() {
        const location = TypeTest._toFileLocation(this.fileName, this.targetLineNum);
        let message = '';
        if (this.regex !== undefined) {
            message = `/${this.pattern}/ `;
        }
        else if (this.pattern !== undefined) {
            message = `"${this.pattern}" `;
        }
        return new Error(`Expected error ${message}not found at ${location}`);
    }
}

class ErrorReport {

    expected = false;

    constructor(protected internalMessage: string) { }

    get message() {
        return this.internalMessage;
    }

    show() {
        console.log(`ERROR: ${this.message}`);
    }

    toError() {
        return new Error(this.message);
    }
}

class CodeErrorReport extends ErrorReport {
    constructor(
        public fileName: string,
        public lineNum: number,
        public charNum: number,
        message: string
    ) {
        super(message);
    }

    get message() {
        return `${this.internalMessage} at `+
                `${this.fileName}:${this.lineNum + 1}:${this.charNum + 1}`;
    }
}

export class TypeTest {

    protected program: ts.Program | undefined; // undefined before run()
    protected directives: Map<string, Directive[]>; // source file => directives
    protected generalErrorReports: ErrorReport[] = []; // failures to begin compilation
    protected codeErrorReports: Map<string, CodeErrorReport[]>; // source file => code errors
    protected errorIndex: Map<string, Map<string, Error[]>>; // file => (group name => errors)

    constructor(public fileNames: string[], public options: ts.CompilerOptions) {
        this.directives = new Map<string, Directive[]>();
        this.codeErrorReports = new Map<string, CodeErrorReport[]>();
        this.errorIndex = new Map<string, Map<string, Error[]>>();
    }

    run(bailOnFirstError = false) {
        this.program = ts.createProgram(this.fileNames, this.options);
        // Must load errors first because compilers loads data on demand.
        this._loadErrors(bailOnFirstError);
        this._loadDirectives();
        if (this.generalErrorReports.length > 0) {
            throw TypeTest._combinedError(this.generalErrorReports);
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

    *errors(filePath = '*', groupName?: string) {
        if (groupName === undefined) {
            for (let file of this.groups(filePath)) {
                const fileIndex = this._getFileIndex(file);
                for (let groupName of fileIndex.keys()) {
                    for (let error of fileIndex.get(groupName)!) {
                        yield error;
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
                for (let error of fileIndex.get(groupName)!) {
                    yield error;
                }
            }
        }
    }

    throwCombinedError(filePath = '*', groupName?: string) {
        const errors: Error[] = [];
        // there is a more performant solution, but this is simplest
        for (let error of this.errors(filePath, groupName)) {
            errors.push(error);
        }
        if (errors.length > 0) {
            throw TypeTest._combinedError(errors);
        }
    }

    throwFirstError(filePath = '*', groupName?: string) {
        for (let error of this.errors(filePath, groupName)) {
            throw error;
        }
    }

    protected _getFileIndex(fileName: string) {

        // Construct errorIndex on demand only as far as needed.

        const cachedFileIndex = this.errorIndex.get(fileName);
        if (cachedFileIndex !== undefined) {
            return cachedFileIndex;
        }
        const fileIndex = new Map<string, Error[]>();

        // Prepare to determine the errors occurring in each group.

        const fileErrorReports = this.codeErrorReports.get(fileName) || [];
        let fileDirectives = this.directives.get(fileName);
        let groupErrorDirectives: ExpectErrorDirective[] = [];
        let reportIndex = 0;
        let groupName = DEFAULT_GROUP_NAME;

        // Collect errors for all groups of the file but the last.

        if (fileDirectives !== undefined) {
            fileDirectives.forEach(directive => {

                if (directive instanceof GroupDirective) {

                    // If not the first group of the file...
                    if (directive.blockLineNum > 1) {
                        const { errors, nextReportIndex } = this._getGroupErrors(
                                    groupErrorDirectives, fileErrorReports,
                                    reportIndex, directive.targetLineNum);
                        fileIndex.set(groupName, errors);
                        groupErrorDirectives = [];
                        reportIndex = nextReportIndex;
                    }
                    groupName = directive.name;
                }
                else if (directive instanceof ExpectErrorDirective) {
                    groupErrorDirectives.push(directive);
                }
            });
        }

        // Collect errors for the last group of the file.

        const { errors } = this._getGroupErrors(groupErrorDirectives,
                fileErrorReports, reportIndex, Number.MAX_SAFE_INTEGER);
        fileIndex.set(groupName, errors);

        // Cache the collected errors and return the file map.

        this.errorIndex.set(fileName, fileIndex);
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

                this._findNextDirective(child, fileMark);
            });
        }
    }

    protected _loadErrors(bailOnFirstError: boolean) {
        const program = this._getProgram();
        let diagnostics = ts.getPreEmitDiagnostics(program);

        diagnostics.forEach(diagnostic => {
            const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
            let errorReport: ErrorReport;
            if (diagnostic.file) {
                const fileName = diagnostic.file.fileName;
                const { line, character } =
                        diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start!);
                errorReport = new CodeErrorReport(fileName, line, character, message);
                const errorReports = this.codeErrorReports.get(fileName) || [];
                errorReports.push(<CodeErrorReport>errorReport);
                if (errorReports.length === 1) {
                    this.codeErrorReports.set(fileName, errorReports);
                }
            }
            else {
                errorReport = new ErrorReport(message);
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

    private _collectDirective(file: ts.SourceFile, node: ts.Node,
            blockLineNum: number, directiveLineNum: number, name: string, value: string
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
            directive = new GroupDirective(blockLineNum, directiveLineNum, targetLineNum, value);
            break;

            case DIRECTIVE_NAME_EXPECT_ERROR:
            directive = new ExpectErrorDirective(file.fileName, blockLineNum, directiveLineNum,
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

    private _findNextDirective(node: ts.Node, fileMark: FileMark) {

        // Track lines read to determine line numbers of directives.
        const blockLineNum = fileMark.linesRead;
        const nodeText = node.getFullText();
        // Start at offset 1 to skip LF ending last read line.
        fileMark.linesRead += TypeTest._countLFs(nodeText, 0);
        console.log(`KIND ${ts.SyntaxKind[node.kind]}`);

        const comments = this._getNodeComments(nodeText);
        if (comments !== null) {
            comments.forEach(comment => {
                const matches = comment.text.match(REGEX_DIRECTIVE);
                if (matches !== null) {
                    const lineNum = fileMark.linesRead -
                            TypeTest._countLFs(nodeText, comment.endIndex);
                    this._collectDirective(fileMark.file, node, blockLineNum, lineNum,
                            matches[1], matches[2]);
                }
            });
        }
    }

    private _getGroupErrors(groupErrorDirectives: ExpectErrorDirective[],
            fileErrorReports: CodeErrorReport[], reportIndex: number,
            nextGroupLineNum: number
    ) {
        const errors: Error[] = [];
        const groupErrorReports: CodeErrorReport[] =
            fileErrorReports.filter(report => report.lineNum < nextGroupLineNum);
        const nextReportIndex = reportIndex + groupErrorReports.length;
        reportIndex = 0; // repurpose for groupErrorReports
        let expectedErrorIndex = 0;

        // Log errors for each target line of code. A target line is a line of
        // code that is either expecting errors or has produced errors. The loop
        // examines each target line separately so that all errors are always
        // reported in the order in which they occur.

        while(true) {

            // Determine the next target line number and its associated values.

            let targetLineNum = Number.MAX_SAFE_INTEGER; // assume last group
            let errorReport: CodeErrorReport | null = null; // at targetlineNum
            let expectedError: ExpectErrorDirective | null = null; // at targetLineNum

            if (expectedErrorIndex < groupErrorDirectives.length) {
                expectedError = groupErrorDirectives[expectedErrorIndex];
                targetLineNum = expectedError.targetLineNum;
            }
            if (reportIndex < groupErrorReports.length) {
                const reportLineNum = groupErrorReports[reportIndex]!.lineNum;
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
                    if (expectedError.matches(errorReport.message)) {
                        // mark expected; don't null or delete in case redundant directives
                        groupErrorReports[targetReportIndex].expected = true;
                    }
                    else {
                        foundAllExpectedErrors = false;
                        errors.push(expectedError.toError());
                    }
                    errorReport = null; // advance to next error report of target line, if any
                    if (++targetReportIndex < groupErrorReports.length &&
                            groupErrorReports[targetReportIndex].lineNum === targetLineNum
                    ) {
                        errorReport = groupErrorReports[targetReportIndex];
                    }
                }
                expectedError = null; // advance to next expected error of target line, if any
                if (++expectedErrorIndex < groupErrorDirectives.length &&
                        groupErrorDirectives[expectedErrorIndex].targetLineNum === targetLineNum
                ) {
                    expectedError = groupErrorDirectives[expectedErrorIndex];
                }
            }

            // Log all errors when no errors were expected, and log all
            // unexpected errors when one or more expected errors is missing.
            // When all expected errors are found, additional errors for the
            // current target line are ignored.

            if (!expectingAtLeastOneError || !foundAllExpectedErrors) {
                // Scan starts from target line's first error report.
                while (reportIndex < groupErrorReports.length &&
                        groupErrorReports[reportIndex].lineNum === targetLineNum
                ) {
                    const checkedErrorReport = groupErrorReports[reportIndex];
                    if (!checkedErrorReport.expected) {
                        errors.push(checkedErrorReport.toError());
                    }
                    ++reportIndex; // advances until reaching next target line
                }
            }
        }
        return { errors, nextReportIndex };
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

    static _combinedError(errors: Error[] | ErrorReport[]) {
        errors = <Error[]>errors; // both types have the .message getter
        return new Error(errors.map(error => error.message).join("\n"));
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

    // static _countLines(text: string, nextIndex: number) {
    //     let count = 0;
    //     do {
    //         ++count;
    //         nextIndex = text.indexOf('\n', nextIndex) + 1;
    //     } while(nextIndex > 0);
    //     return count;
    // }
}

const test = new TypeTest(process.argv.slice(2), {
    noEmitOnError: true,
    noImplicitAny: true,
    target: ts.ScriptTarget.ES5,
    module: ts.ModuleKind.CommonJS
});
test.run();

for (let err of test.errors()) {
    console.log(err);
}
