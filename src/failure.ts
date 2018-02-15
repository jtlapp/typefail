
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

export class Failure {
    constructor(
        public type: FailureType,
        public at: FileLocation,
        public code?: number,
        public message?: string
    ) { }

    toErrorString() {
        let type: string;
        if (this.type === FailureType.MissingError) {
            type = 'missing error';
        }
        else {
            type = 'error';
        }
        const code = (this.code === undefined ? '' : ` TS${this.code}`);
        const message = (this.message === undefined ? '' : `: ${this.message}`);
        const location = tsutil.toFileLocation(this.at.fileName, this.at.lineNum, this.at.charNum);
        return `${type}${code}${message} at ${location}`;
    }
}
