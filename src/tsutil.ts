
import * as ts from 'typescript';
import { dirname } from 'path';

const LF = "\n".charCodeAt(0);

export interface CommentInfo {
    lineNum: number;
    startOfLine: number;
    endOfComment: number;
}

export function countLFs(text: string, nextIndex: number) {
    let count = 0;
    while ((nextIndex = text.indexOf('\n', nextIndex) + 1) > 0) {
        ++count;
    }
    return count;
}

export function getNodeComments(compiler: typeof ts, nodeText: string, linesRead: number)
: CommentInfo[] | null {
    // Rely on the library for skipping (multiply) commented-out directives.
    const commentRanges = compiler.getLeadingCommentRanges(nodeText, 0);
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

export function loadCompilerOptions(compiler: typeof ts, tsconfigPath: string) {
    const {config, error} = compiler.readConfigFile(tsconfigPath, ts.sys.readFile);
    if (error) {
        throw new Error(compiler.flattenDiagnosticMessageText(error.messageText, '\n'));
    }
    const {options, errors} = compiler.convertCompilerOptionsFromJson(
            config.compilerOptions, dirname(tsconfigPath));
    if (errors.length > 0) {
        throw new Error(compiler.flattenDiagnosticMessageText(errors[0].messageText, '\n'));
    }
    return options;
}

export function normalizePaths(rootRegex: RegExp | null, fileName: string) {
    if (rootRegex === null) {
        return fileName;
    }
    return fileName.replace(rootRegex, '');
}

export function toFileLocation(fileName: string, lineNum: number, charNum?: number) {
    if (charNum === undefined) {
        return `${fileName}:${lineNum}`;
    }
    return `${fileName}:${lineNum}:${charNum}`;
}
