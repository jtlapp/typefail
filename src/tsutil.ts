
import * as ts from 'typescript';

export interface CommentInfo {
    text: string;
    startIndex: number;
    endIndex: number;
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

export function countLFs(text: string, nextIndex: number) {
    let count = 0;
    while ((nextIndex = text.indexOf('\n', nextIndex) + 1) > 0) {
        ++count;
    }
    return count;
}

export function toFileLocation(fileName: string, lineNum: number, charNum?: number) {
    if (charNum === undefined) {
        return `${fileName}:${lineNum}`;
    }
    return `${fileName}:${lineNum}:${charNum}`;
}
