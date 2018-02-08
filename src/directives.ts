
import * as ts from 'typescript';
import * as tsutil from './tsutil';
import { FailureType, Failure } from './failure';

const DIRECTIVE_NAME_GROUP = 'group';
const DIRECTIVE_NAME_EXPECT_ERROR = 'expect-error';

export abstract class Directive {

    static readonly DIRECTIVE_PREFIX = '@typetest';

    constructor(
        public targetLineNum: number
    ) { }

    static create(file: ts.SourceFile, isFirstNode: boolean, node: ts.Node,
            directiveLineNum: number, name: string, value: string
    ) {
        name = name.toLowerCase(); // directives are not case sensitive
        const targetLineNum = file.getLineAndCharacterOfPosition(node.getStart()).line;
        let directive: Directive;

        switch (name) {
            case DIRECTIVE_NAME_GROUP:
            if (value === '') {
                throw new Error(`'${Directive.toDirective(name)}' directive missing group name `+
                        `at ${tsutil.toFileLocation(file.fileName, directiveLineNum)}`);
            }
            directive = new GroupDirective(isFirstNode, targetLineNum, value);
            break;

            case DIRECTIVE_NAME_EXPECT_ERROR:
            directive = new ExpectErrorDirective(file.fileName, directiveLineNum,
                    targetLineNum, value);
            break;

            default:
            if (name === '') {
                throw new Error(`Directive must have the form `+
                        `'${Directive.toDirective('<name>')}.`);
            }
            throw new Error(`Invalid directive '${Directive.toDirective(name)}'.`);
        }
        return directive;
    }

    static toDirective(name: string) {
        return `${Directive.DIRECTIVE_PREFIX}:${name}`;
    }
}

export class GroupDirective extends Directive {

    static readonly DEFAULT_GROUP_NAME = 'Unnamed TypeTest Group';
    
    isFirstNode: boolean;
    name: string;

    constructor(isFirstNode: boolean, targetLineNum: number, name: string) {
        super(targetLineNum);
        this.isFirstNode = isFirstNode;
        this.name = name;
    }
}

export class ExpectErrorDirective extends Directive {

    fileName: string;
    pattern: string | undefined;
    expectedErrors: ExpectedError[] = [];

    constructor(
        fileName: string,
        directiveLineNum: number,
        targetLineNum: number,
        pattern: string | undefined
    ) {
        super(targetLineNum);
        this.fileName = fileName;
        if (pattern === undefined) {
            this.expectedErrors.push(new ExpectedError(this, undefined, 'any error',
                (failure) => true));
        }
        else {
            const matches = pattern.match(/^[/](.+)[/]([imu]+)?$/);
            if (matches !== null) {
                const regex = new RegExp(matches[1], matches[2]);
                this.expectedErrors.push(new ExpectedError(this, undefined, pattern,
                    (failure) => regex.test(failure.message!)));
            }
            else if (/^("(.+)")|('(.+)')|(`(.+)`)$/.test(pattern)) {
                const exactMessage = pattern.substr(1, pattern.length - 2);
                this.expectedErrors.push(new ExpectedError(this, undefined, exactMessage,
                    (failure) => failure.message === exactMessage));
            }
            else if (/^\d+(, *\d+)*$/.test(pattern)) {
                const codes = pattern.split(',').map(codeStr => parseInt(codeStr.trim()));
                codes.forEach(code => {
                    this.expectedErrors.push(new ExpectedError(this, code, undefined,
                        (failure => failure.code === code)));
                });
            }
            else {
                const directive = Directive.toDirective(DIRECTIVE_NAME_EXPECT_ERROR);
                const location = tsutil.toFileLocation(this.fileName, this.targetLineNum);
                throw new Error(`Invalid ${directive} directive at ${location}`);
            }
        }
        this.pattern = pattern;
    }

    addExpectedErrors(accumulatedExpectedErrors: ExpectedError[]) {
        this.expectedErrors.forEach(expectedError => {
            accumulatedExpectedErrors.push(expectedError);
        });
    }
}

export class ExpectedError {
    constructor(
        public directive: ExpectErrorDirective,
        public code: number | undefined,
        public message: string | undefined,
        public matches: (failure: Failure) => boolean
    ) { }

    toFailure() {
        return new Failure(FailureType.MissingError, this.code, this.message, {
            fileName: this.directive.fileName,
            lineNum: this.directive.targetLineNum
        });
    }
}
