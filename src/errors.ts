
export abstract class TypeTestError extends Error {
    code: number | undefined;

    constructor(message: string, code?: number) {
        super(message);
        this.code = code;
    }
}

export class TestSetupError extends TypeTestError { }

export class TestFailureError extends TypeTestError { }
