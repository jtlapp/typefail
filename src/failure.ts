
import * as tsutil from './tsutil';

export enum FailureType {
    UnexpectedError,
    MissingError
}

export interface FileLocation {
    fileName: string;
    lineNum: number;
    charNum?: number;
}

export interface Failure {
    type: FailureType;
    at: FileLocation;
    code?: number;
    message?: string;
}

export function toErrorString(failure: Failure) {
    let errorType: string;
    if (failure.type === FailureType.MissingError) {
        errorType = 'missing error';
    }
    else {
        errorType = 'unexpected error';
    }

    const codeStr = (failure.code === undefined ? '' : ` TS${failure.code}`);
    const message = (failure.message === undefined ? '' : `: ${failure.message}`);
    const location = tsutil.toFileLocation(failure.at.fileName, failure.at.lineNum,
            failure.at.charNum);
    return `${errorType}${codeStr}${message} at ${location}`;
}
