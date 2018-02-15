
import * as ts from 'typescript';
import * as tsutil from './tsutil';
import { FailureType, Failure } from './failure';
import { TestSetupError } from './errors';

const DIRECTIVE_PREFIX = 'typetest';
const DIRECTIVE_NAME_GROUP = 'group';
const DIRECTIVE_NAME_EXPECT_ERROR = 'expect-error';

const COMMA = ",".charCodeAt(0);
const SPACE = " ".charCodeAt(0);

const REGEX_SLASHSLASH_SYNTAX =
        new RegExp(`^([ \t]*//[ ]*${DIRECTIVE_PREFIX}:)(.*)(?:\n|$)`);
const REGEX_SLASHSTAR_SYNTAX =
        new RegExp(`^([ \t]*/[*][ ]*${DIRECTIVE_PREFIX}:)((?:[^*\n]|[*]+[^/*])*)([*]+/[^\n]*)?`);
const REGEX_NAME_VALUE = /^([^ \t]+)(.*)$/; // value can be empty string

const VALID_REGEX_FLAGS = 'imu';
const REGEX_REGEX = /^\/((?:[^[\/\\]+|\[\^?(?:[^\]\\]|\\.)*\]|\\.)+)\/([a-zA-Z]+)?/;
const REGEX_SQ_STRING = /^'((?:[^'\\]|\\.)+)'/;
const REGEX_DQ_STRING = /^"((?:[^"\\]|\\.)+)"/;

interface Param {
    charNum: number, // number of char in line of first char of parameter
    value: any // value of the parameter
}

export abstract class Directive {

    constructor(
        public type: string,
        public fileName: string,
        public directiveLineNum: number,
        public targetLineNum: number
    ) { }

    error(message: string, charNum: number) {
        return new TestSetupError(`'${Directive.toDirective(this.type)}' directive ${message} `+
                `at ${tsutil.toFileLocation(this.fileName, this.directiveLineNum, charNum)}`);
    }

    // Generically parse directive parameters, allowing for easy expansion later.
    // Returns null when the provided comment line is not a TypeTest directive.

    static parse(
        file: ts.SourceFile,
        isFirstNode: boolean,
        node: ts.Node,
        nodeText: string,
        commentInfo: tsutil.CommentInfo
    ): Directive | TestSetupError | null {
        
        // Determine whether this comment is an attempt at a typetest directive.

        const commentText = nodeText.substring(commentInfo.startOfLine, commentInfo.endOfComment);
        let matches = commentText.match(REGEX_SLASHSLASH_SYNTAX);
        if (matches === null) {
            matches = commentText.match(REGEX_SLASHSTAR_SYNTAX);
            if (matches !== null) {
                const tail = matches[3];
                if (tail === undefined) {
                    return Directive.error(`${DIRECTIVE_PREFIX} directives must be single line`,
                            file, commentInfo.lineNum);
                }
                if (!tail.trimRight().endsWith('*/')) {
                    return Directive.error(`Code cannot follow a ${DIRECTIVE_PREFIX} directive`,
                            file, commentInfo.lineNum);
                }
            }
        }
        if (matches === null) {
            return null;
        }
        const targetLineNum = file.getLineAndCharacterOfPosition(node.getStart()).line;

        // Extract the directive name.

        let charNum = matches[1].length + 1;
        matches = matches[2].match(REGEX_NAME_VALUE);
        if (matches === null) {
            return Directive.error(`${DIRECTIVE_PREFIX} directive name not specified`,
                    file, commentInfo.lineNum, charNum);
        }
        charNum += matches[1].length;
        const name = matches[1];

        // Extract the directive parameters, parsing each in turn.

        const params: Param[] = [];
        let pattern = matches[2].trimLeft();
        charNum += matches[2].length - pattern.length; // skip spacing
        pattern = pattern.trimRight();
        
        while (pattern !== '') {
            const firstChar = pattern[0];
            matches = null;

            // Parse a regex parameter.

            if (firstChar === '/') {
                matches = pattern.match(REGEX_REGEX);
                if (matches === null) {
                    return Directive.error(`Invalid ${DIRECTIVE_PREFIX} regex parameter`,
                            file, commentInfo.lineNum, charNum);
                }
                const flags = matches[2];
                if (flags !== undefined) {
                    for (let char of flags) {
                        if (VALID_REGEX_FLAGS.indexOf(char) === -1) {
                            return Directive.error(
                                `Unrecognized ${DIRECTIVE_PREFIX} regex flags`,
                                    file, commentInfo.lineNum, charNum);
                        }
                    }
                }
                params.push({ charNum, value: new RegExp(matches[1], flags) });
            }

            // Parse a string parameter.

            else if (firstChar === "'" || firstChar === '"') {
                if (firstChar === "'") {
                    matches = pattern.match(REGEX_SQ_STRING);
                }
                else {
                    matches = pattern.match(REGEX_DQ_STRING);
                }
                if (matches === null) {
                    return Directive.error(`Invalid ${DIRECTIVE_PREFIX} string parameter`,
                            file, commentInfo.lineNum, charNum);
                }
                const value = matches[1].replace('\\"', '"').replace("\\'", "'")
                        .replace("\\\\", '\\');
                params.push({ charNum, value });
            }

            // Parse an integer parmaeter.

            else {
                matches = pattern.match(/^\d[^ \t,]*/); // check whether starts with a digit
                if (matches !== null) {
                    matches = matches[0].match(/^\d+$/);
                    if (matches === null) {
                        return Directive.error(`Invalid ${DIRECTIVE_PREFIX} integer parameter`,
                                file, commentInfo.lineNum, charNum);
                    }
                    params.push({ charNum, value: parseInt(matches[0]) });
                }
            }

            // Handle failure to recognize parameter type.

            if (matches === null) {
                return Directive.error(`Invalid ${DIRECTIVE_PREFIX} directive parameter`,
                        file, commentInfo.lineNum, charNum);
            }

            // Advance to the next parameter, if any.

            pattern = pattern.substr(matches[0].length);
            charNum += matches[0].length;
            if (pattern !== '') { // previously-trimmed pattern doesn't include whitespace

                // Skip spaces following prior parameter.

                let offset = 0;
                while (offset < pattern.length && pattern.charCodeAt(offset) === SPACE) {
                    ++offset;
                    ++charNum;
                }

                // Parse the comma and following whitespace.

                if (offset < pattern.length && pattern.charCodeAt(offset) !== COMMA) {
                    return Directive.error(`Invalid ${DIRECTIVE_PREFIX} directive syntax`,
                            file, commentInfo.lineNum, charNum);
                }
                ++offset;
                ++charNum;

                // Parse any whitespace following comma.

                while (offset < pattern.length && pattern.charCodeAt(offset) === SPACE) {
                    ++offset;
                    ++charNum;
                }

                // Load pattern for remaining parameters.

                pattern = pattern.substr(offset);
                if (pattern === '') {
                    return Directive.error(`Expecting a ${DIRECTIVE_PREFIX} directive parameter`,
                            file, commentInfo.lineNum, charNum);
                }
            }
        }

        // Construct the directive.

        let directive: Directive;
        try {
            switch (name) {
                case DIRECTIVE_NAME_GROUP:
                directive = new GroupDirective(file.fileName, commentInfo.lineNum, targetLineNum,
                        isFirstNode, params);
                break;

                case DIRECTIVE_NAME_EXPECT_ERROR:
                directive = new ExpectErrorDirective(file.fileName, commentInfo.lineNum,
                        targetLineNum, params);
                break;

                default:
                return Directive.error(`Invalid directive name '${Directive.toDirective(name)}'`,
                        file, commentInfo.lineNum);
            }
        }
        catch (err) {
            if (err instanceof TestSetupError) {
                return err;
            }
            throw err;
        }
        return directive;
    }

    static error(message: string, file: ts.SourceFile, lineNum: number, charNum?: number) {
        return new TestSetupError(`${message} at `+
                tsutil.toFileLocation(file.fileName, lineNum, charNum));
    }

    static toDirective(name: string) {
        return `${DIRECTIVE_PREFIX}:${name}`;
    }
}

export class GroupDirective extends Directive {

    isFirstNode: boolean;
    groupName: string;

    constructor(
        fileName: string,
        directiveLineNum: number,
        targetLineNum: number,
        isFirstNode: boolean,
        params: Param[]
    ) {
        super(DIRECTIVE_NAME_GROUP, fileName, directiveLineNum, targetLineNum);
        this.isFirstNode = isFirstNode;
        if (params.length > 1) {
            throw this.error("takes only one parameter", params[1].charNum);
        }
        if (params.length === 0 || typeof params[0].value !== 'string') {
            throw this.error("requires a group name", params[0].charNum);
        }
        this.groupName = params[0].value;
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
        params: Param[]
    ) {
        super(DIRECTIVE_NAME_EXPECT_ERROR, fileName, directiveLineNum, targetLineNum);

        if (params.length === 0) {
            this.expectedErrors.push(new ExpectedError(this, undefined, 'any error',
                (failure) => true /*match any error*/));
        }
        else {
            const firstValue = params[0].value;
            if (firstValue instanceof RegExp) {
                if (params.length > 1) {
                    throw this.error("invalid parameter", params[1].charNum);
                }
                const pattern = `/${firstValue.source}/${firstValue.flags}`;
                this.expectedErrors.push(new ExpectedError(this, undefined, pattern,
                    (failure) => firstValue.test(failure.message!)));
            }
            else if (typeof firstValue === 'string') {
                if (params.length > 1) {
                    throw this.error("invalid parameter", params[1].charNum);
                }
                const pattern = `"${firstValue.replace('"', '\\"')}"`;
                this.expectedErrors.push(new ExpectedError(this, undefined, pattern,
                    (failure) => failure.message === firstValue));
            }
            else if (typeof firstValue === 'number') {
                params.forEach(param => {
                    if (typeof param.value !== 'number') {
                        throw this.error("invalid parameter", param.charNum);
                    }
                    const code = param.value;
                    this.expectedErrors.push(new ExpectedError(this, code, undefined,
                        (failure => failure.code === code)));
                });
            }
            else {
                throw this.error("invalid parameter", params[0].charNum);
            }
        }
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
        return new Failure(
            FailureType.MissingError,
            {
                fileName: this.directive.fileName,
                lineNum: this.directive.targetLineNum
            },
            this.code,
            this.message
        );
    }
}
