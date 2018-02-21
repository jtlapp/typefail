
export abstract class CheckerError extends Error {
    code: number | undefined;

    constructor(message: string, code?: number) {
        super(message);
        this.code = code;
    }
}

export class CheckerSetupError extends CheckerError { }

export class CheckerFailureError extends CheckerError { }
