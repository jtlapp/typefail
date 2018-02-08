
import * as ts from 'typescript';
import { dirname } from 'path';

export interface CommentInfo {
    text: string;
    startIndex: number;
    endIndex: number;
}

export function countLFs(text: string, nextIndex: number) {
    let count = 0;
    while ((nextIndex = text.indexOf('\n', nextIndex) + 1) > 0) {
        ++count;
    }
    return count;
}

export function getNodeComments(nodeText: string): CommentInfo[] | null {
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

export function toFileLocation(fileName: string, lineNum: number, charNum?: number) {
    if (charNum === undefined) {
        return `${fileName}:${lineNum}`;
    }
    return `${fileName}:${lineNum}:${charNum}`;
}
