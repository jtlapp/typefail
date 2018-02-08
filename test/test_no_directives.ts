
import 'mocha';
import { assert } from 'chai';
import * as fs from 'fs';
import { join } from 'path';
import * as ts from 'typescript';
import { TypeTest, Failure, FailureType } from '../src';

const TEST_FILENAME = join(__dirname, 'fixtures/no_directives.ts');
const expectedErrorLines = getExpectedErrorLines(TEST_FILENAME);

class ErrorLine {
    strict: boolean;
    lineNum: number;
    code: number;
}

describe("compiler configuration", () => {

    it("uses provided compiler configuration", (done) => {
        const laxCompilerOptions = {
            allowUnreachableCode: true,
            module: ts.ModuleKind.CommonJS,
            target: ts.ScriptTarget.ES2016
        };

        const strictCompilerOptions = {
            allowUnreachableCode: false,
            module: ts.ModuleKind.CommonJS,
            strict: true,
            noImplicitReturns: true,
            noUnusedLocals: true,
            noFallthroughCasesInSwitch: true,
            target: ts.ScriptTarget.ES2016
        };

        let typeTest = new TypeTest([TEST_FILENAME], {
            compilerOptions: strictCompilerOptions
        });
        verifyFailures(typeTest, true);

        typeTest = new TypeTest([TEST_FILENAME], {
            compilerOptions: laxCompilerOptions
        });
        verifyFailures(typeTest, false);

        done();
    });

    it("uses named tsconfig.json file", (done) => {

        let typeTest = new TypeTest([TEST_FILENAME], {
            compilerOptions: join(__dirname, 'fixtures/tsconfig.json')
        });
        verifyFailures(typeTest, true);

        typeTest = new TypeTest([TEST_FILENAME], {
            compilerOptions: join(__dirname, 'fixtures/tsconfig_lax.json')
        });
        verifyFailures(typeTest, false);

        done();
    });

    it("errors on invalid tsconfig.json file", (done) => {

        assert.throws(() => {
            new TypeTest([TEST_FILENAME], {
                compilerOptions: join(__dirname, 'fixtures/tsconfig_invalid.json')
            });
        }, /module/);
        done();
    });

    it("errors when named tsconfig.json file not found", (done) => {

        assert.throws(() => {
            new TypeTest([TEST_FILENAME], {
                compilerOptions: join(__dirname, 'fixtures/tsconfig_notthere.json')
            });
        }, /does not exist/);
        done();
    });
});

function getExpectedErrorLines(filename: string) {
    const errorLines: ErrorLine[] = [];
    const lines = fs.readFileSync(filename).toString().split("\n");
    for (let lineNum = 1; lineNum <= lines.length; ++lineNum) {
        const line = lines[lineNum - 1];
        const matches = line.match(/[/][*](strict )?TS(\d+)[*][/]/);
        if (matches !== null) {
            errorLines.push({
                strict: (matches[1] !== undefined),
                lineNum,
                code: parseInt(matches[2])
            });
        }
    }
    return errorLines;
}

function verifyFailures(typeTest: TypeTest, strict: boolean) {

    // Collect the failures.

    typeTest.run();
    const failures: Failure[] = [];
    for (let failure of typeTest.failures()) {
        failures.push(failure);
    }

    // Verify that each expected error occurs at its indicated line.

    let failureIndex = 0;
    expectedErrorLines.forEach(errorLine => {

        if (strict || !errorLine.strict) {
            let foundError = false;
            if (failureIndex < failures.length) {
                const failuresAtLine = getAllFailuresAtLine(failures, failureIndex);
                const nextFailure = failuresAtLine[0];
                if (nextFailure.at!.lineNum < errorLine.lineNum) {
                    assert(false, `unexpected failure: ${nextFailure.toErrorString()}`);
                }
                else if (nextFailure.at!.lineNum === errorLine.lineNum) {
                    foundError = failuresAtLine.reduce((found, failure) => {

                        return (found || failure.code === errorLine.code);
                    }, false);
                    failureIndex += failuresAtLine.length;
                }
            }
            if (!foundError) {
                assert(false, `missing failure: ${toErrorString(errorLine)}`);
            }
        }
    });

    // Verify that each erroring line has at least one expected failure.

    if (failureIndex < failures.length) {
        const nextFailure = failures[failureIndex];
        assert(false, `unexpected failure: ${nextFailure.toErrorString()}`);
    }
}

function getAllFailuresAtLine(failures: Failure[], failureIndex: number) {
    const failuresAtLine: Failure[] = [];
    const lineNum = failures[failureIndex].at!.lineNum;
    while (failureIndex < failures.length) {
        const failure = failures[failureIndex];
        validateFailure(failure);
        if (failure.at!.lineNum !== lineNum) {
            break;
        }
        failuresAtLine.push(failure);
        ++failureIndex;
    }
    return failuresAtLine;
}

function validateFailure(failure: Failure) {
    assert.isDefined(failure.code, 'failure.code should be defined');
    assert.isDefined(failure.message, 'failure.message should be defined');
    assert.isDefined(failure.at, 'failure.at should be defined');
}


function toErrorString(errorLine: ErrorLine) {
    const failure = new Failure(FailureType.MissingError, errorLine.code, undefined, {
        fileName: TEST_FILENAME,
        lineNum: errorLine.lineNum
    });
    return failure.toErrorString();
}
