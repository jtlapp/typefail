
import 'mocha';
import { assert } from 'chai';
import * as fs from 'fs';
import { join } from 'path';
import * as ts from 'typescript';
import { FailChecker, Failure, FailureType, CheckerSetupError } from '../src';

const TEST_FILENAME = join(__dirname, 'fixtures/ts_errors.ts');
const expectedErrorLines = getExpectedErrorLines(TEST_FILENAME);
const strictConfigFile = join(__dirname, 'fixtures/tsconfig.json');

interface ErrorLine {
    strict: boolean;
    lineNum: number;
    code: number;
}

describe("handling bad source file paths", () => {

    it("errors when no files are specified", (done) => {

        assert.throws(() => {
            new FailChecker([], {
                compilerOptions: strictConfigFile
            });
        }, /requires at least one file/);
        done();
    });

    it("errors when specified files are not found", (done) => {

        const checker = new FailChecker([
            join(__dirname, 'fixtures/notthere1.ts'),
            join(__dirname, 'fixtures/notthere2.ts'),
        ], {
            compilerOptions: strictConfigFile
        });
        try {
            checker.run(false);
            assert(false, "should have gotten setup errors");
        }
        catch (err) {
            if (!(err instanceof CheckerSetupError)) {
                throw err;
            }
            const errors = err.message.split(FailChecker.ERROR_DELIM);
            assert.strictEqual(errors.length, 2);
            assert.match(errors[0], /notthere1.ts' not found/);
            assert.match(errors[1], /notthere2.ts' not found/);
        }
        done();
    });

    it("errors when wildcard specification matches no files", (done) => {

        const checker = new FailChecker(join(__dirname, 'fixtures/notthere*.ts'), {
            compilerOptions: strictConfigFile
        });
        try {
            checker.run();
            assert(false, "should have gotten a setup error");
        }
        catch (err) {
            if (!(err instanceof CheckerSetupError)) {
                throw err;
            }
            assert.match(err.message, /No source files were found to check/);
        }
        done();
    });

    it("errors when a source file path is not absolute", (done) => {

        assert.throws(() => {

            new FailChecker([
                '/absolute/path',
                'relative/path'
            ], {
                compilerOptions: strictConfigFile
            });
        }, /not an absolute path/);

        assert.throws(() => {

            new FailChecker([
                'relative/path',
                './another/relative/path'
            ], {
                compilerOptions: strictConfigFile
            });
        }, /not an absolute path/);

        done();
    });
});

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

        let checker = new FailChecker(TEST_FILENAME, {
            compilerOptions: strictCompilerOptions
        });
        verifyFailures(checker, true);

        checker = new FailChecker(TEST_FILENAME, {
            compilerOptions: laxCompilerOptions
        });
        verifyFailures(checker, false);

        done();
    });

    it("uses named tsconfig.json file", (done) => {

        let checker = new FailChecker(TEST_FILENAME, {
            compilerOptions: strictConfigFile
        });
        verifyFailures(checker, true);

        checker = new FailChecker(TEST_FILENAME, {
            compilerOptions: join(__dirname, 'fixtures/tsconfig_lax.json')
        });
        verifyFailures(checker, false);

        done();
    });

    it("errors on invalid tsconfig.json file", (done) => {

        assert.throws(() => {
            new FailChecker(TEST_FILENAME, {
                compilerOptions: join(__dirname, 'fixtures/tsconfig_invalid.json')
            });
        }, /module/);
        done();
    });

    it("errors when named tsconfig.json file not found", (done) => {

        assert.throws(() => {
            new FailChecker(TEST_FILENAME, {
                compilerOptions: join(__dirname, 'fixtures/tsconfig_notthere.json')
            });
        }, /does not exist/);
        done();
    });
});

describe("root path configuration", () => {

    it("report absolute paths in errors when there is no root path", (done) => {

        const absFile = join(__dirname, 'fixtures/missing_unexpected.ts');
        const checker = new FailChecker(absFile, {
            compilerOptions: strictConfigFile
        });
        checker.run();
        const failures = <string[]>[];
        for (let failure of checker.failures()) {
            failures.push(failure.toErrorString());
        }
        assert.strictEqual(failures.length, 2);
        assert.include(failures[0], absFile);
        assert.include(failures[1], absFile);
        done();
    });

    it("reports relative paths in errors when there is a root path", (done) => {

        const relFile = 'fixtures/missing_unexpected.ts';
        const absFile = join(__dirname, relFile);
        const checker = new FailChecker(absFile, {
            compilerOptions: strictConfigFile,
            rootPath: __dirname
        });
        checker.run();
        const failures = <string[]>[];
        for (let failure of checker.failures()) {
            failures.push(failure.toErrorString());
        }
        assert.strictEqual(failures.length, 2);
        assert.include(failures[0], relFile);
        assert.notInclude(failures[0], absFile);
        assert.include(failures[1], relFile);
        assert.notInclude(failures[1], absFile);
        done();
    });

    it("errors when a source file is not in the root path", (done) => {

        assert.throws(() => {
            new FailChecker(join(__dirname, 'fixtures/sampledir/file1a.ts'), {
                compilerOptions: strictConfigFile,
                rootPath: "/somecrazyrootpaththatisnotthere"
            });
        }, /not in the root path/);
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

function verifyFailures(checker: FailChecker, strict: boolean) {

    // Collect the failures.

    checker.run();
    const failures: Failure[] = [];
    for (let failure of checker.failures()) {
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
                if (nextFailure.at.lineNum < errorLine.lineNum) {
                    assert(false, `unexpected failure: ${nextFailure.toErrorString()}`);
                }
                else if (nextFailure.at.lineNum === errorLine.lineNum) {
                    foundError = failuresAtLine.reduce((found, failure) => {

                        return (found || failure.code === errorLine.code);
                    }, false);
                    failureIndex += failuresAtLine.length;
                }
            }
            if (!foundError) {
                assert(false, `missing failure: ${toErrorStringFromLine(errorLine)}`);
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
    const lineNum = failures[failureIndex].at.lineNum;
    while (failureIndex < failures.length) {
        const failure = failures[failureIndex];
        validateFailure(failure);
        if (failure.at.lineNum !== lineNum) {
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


function toErrorStringFromLine(errorLine: ErrorLine) {
    return FailChecker.toErrorString(
        FailureType.MissingError,
        {
            fileName: TEST_FILENAME,
            lineNum: errorLine.lineNum
        },
        errorLine.code
    );
}
