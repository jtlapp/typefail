
import * as ts from 'typescript';
import { dirname } from 'path';

const LF = "\n".charCodeAt(0);

export interface CommentInfo {
    lineNum: number;
    startOfLine: number;
    endOfComment: number;
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

export function countLFs(text: string, nextIndex: number) {
    let count = 0;
    while ((nextIndex = text.indexOf('\n', nextIndex) + 1) > 0) {
        ++count;
    }
    return count;
}

export function getNodeComments(nodeText: string, linesRead: number): CommentInfo[] | null {
    // Rely on the library for skipping (multiply) commented-out directives.
    const commentRanges = ts.getLeadingCommentRanges(nodeText, 0);
    if (commentRanges === undefined || commentRanges.length === 0) {
        return null;
    }
    return commentRanges.map(range => {
        let endOfPriorLine = range.pos;
        while (endOfPriorLine >= 0 && nodeText.charCodeAt(endOfPriorLine) !== LF) {
            --endOfPriorLine;
        }
        const startOfLine = endOfPriorLine + 1;
        return {
            lineNum: linesRead - countLFs(nodeText, startOfLine),
            startOfLine: startOfLine,
            endOfComment: range.end
        };
    });
}

export function normalizePaths(rootRegex: RegExp | null, fileName: string) {
    if (rootRegex === null) {
        return fileName;
    }
    return fileName.replace(rootRegex, '');
}

export function loadCompilerOptions(tsconfigPath: string) {
    const {config, error} = ts.readConfigFile(tsconfigPath, ts.sys.readFile);
    if (error) {
        throw new Error(ts.flattenDiagnosticMessageText(error.messageText, '\n'));
    }
    const {options, errors} = ts.convertCompilerOptionsFromJson(
            config.compilerOptions, dirname(tsconfigPath));
    if (errors.length > 0) {
        throw new Error(ts.flattenDiagnosticMessageText(errors[0].messageText, '\n'));
    }
    return options;
}

export function toErrorString(
    type: FailureType,
    at: FileLocation,
    code?: number,
    message?: string
) {
    let errorType: string;
    if (type === FailureType.MissingError) {
        errorType = 'missing error';
    }
    else {
        errorType = 'unexpected error';
    }

    const codeStr = (code === undefined ? '' : ` TS${code}`);

    message = (message === undefined ? '' : `: ${message}`);
    let location = toFileLocation(at.fileName, at.lineNum, at.charNum);
    
    return `${errorType}${codeStr}${message} at ${location}`;
}

export function toFileLocation(fileName: string, lineNum: number, charNum?: number) {
    if (charNum === undefined) {
        return `${fileName}:${lineNum}`;
    }
    return `${fileName}:${lineNum}:${charNum}`;
}
