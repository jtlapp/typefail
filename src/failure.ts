
import * as tsutil from './tsutil';

export interface Failure {
    type: tsutil.FailureType;
    at: tsutil.FileLocation;
    code?: number;
    message?: string;

    toErrorString(): string;
}

export interface RootedFailure extends Failure { }
export class RootedFailure implements Failure {
    protected rootRegex: RegExp | null;

    constructor(
        rootRegex: RegExp | null,
        type: tsutil.FailureType,
        at: tsutil.FileLocation,
        code?: number,
        message?: string
    ) {
        this.rootRegex = rootRegex;
        this.type = type;
        this.at = at;
        this.code = code;
        this.message = message;
    }

    toErrorString() {
        let message = this.message;
        if (message !== undefined) {
            message = tsutil.normalizePaths(this.rootRegex, message);
        }
        const at = {
            fileName: tsutil.normalizePaths(this.rootRegex, this.at.fileName),
            lineNum: this.at.lineNum,
            charNum: this.at.charNum
        };
        return tsutil.toErrorString(this.type, at, this.code, message);
    }
}
