
import 'mocha';
import { assert } from 'chai';
import * as path from 'path';
import { FailChecker, FailureType } from '../src';
import { FailureInfo, verifyErrorMessages } from './lib/testlib';

const testFile = path.join(__dirname, 'fixtures/mock_test.ts');
const tsconfigFile = path.join(__dirname, 'fixtures/tsconfig.json');

describe("mockup test", () => {

    const checker = new FailChecker(testFile, {
        compilerOptions: tsconfigFile,
        rootPath: __dirname
    });
    checker.run();

    const group1 = "Passes when there are no expected errors";
    it(group1, (done) => {

        _verifyFailures(checker, group1, []);
        done();
    });

    const group2 = "Accepts all same-line errors by default";
    it(group2, (done) => {

        _verifyFailures(checker, group2, []);
        done();
    });

    const group3 = "Accepts a single expected error";
    it(group3, (done) => {

        _verifyFailures(checker, group3, []);
        done();
    });

    const group4 = "Accepts multiple same-line errors upon matching one";
    it(group4, (done) => {

        _verifyFailures(checker, group4, []);
        done();
    });

    const group5 = "Accepts multiple expected same line errors";
    it(group5, (done) => {

        _verifyFailures(checker, group5, []);
        done();
    });

    const group6 = "Fails when no expected error occurs";
    it(group6, (done) => {

        const failures: FailureInfo[] = [
            {
                "type": 1,
                "at": {
                    "fileName": "fixtures/mock_test.ts",
                    "lineNum": 58
                },
                "message": "\"Not a real error.\""
            },
            {
                "type": 1,
                "at": {
                    "fileName": "fixtures/mock_test.ts",
                    "lineNum": 60
                },
                "code": 2451
            },
            {
                "type": 1,
                "at": {
                    "fileName": "fixtures/mock_test.ts",
                    "lineNum": 65
                },
                "code": 2451
            },
            {
                "type": 1,
                "at": {
                    "fileName": "fixtures/mock_test.ts",
                    "lineNum": 65
                },
                "code": 2540
            }
        ];
        _verifyFailures(checker, group6, failures);
        done();
    });

    const group7 = "Fails when error matches no expected error";
    it(group7, (done) => {

        const failures: FailureInfo[] = [
            {
                "type": 1,
                "at": {
                    "fileName": "fixtures/mock_test.ts",
                    "lineNum": 70
                },
                "code": 2000
            },
            {
                "type": 0,
                "at": {
                    "fileName": "fixtures/mock_test.ts",
                    "lineNum": 70,
                    "charNum": 24
                },
                "code": 2345,
                "message": "Argument of type '32' is not assignable to parameter of type 'string'."
            },
            {
                "type": 1,
                "at": {
                    "fileName": "fixtures/mock_test.ts",
                    "lineNum": 73
                },
                "code": 2000
            },
            {
                "type": 1,
                "at": {
                    "fileName": "fixtures/mock_test.ts",
                    "lineNum": 73
                },
                "code": 2001
            },
            {
                "type": 1,
                "at": {
                    "fileName": "fixtures/mock_test.ts",
                    "lineNum": 73
                },
                "code": 2002
            },
            {
                "type": 0,
                "at": {
                    "fileName": "fixtures/mock_test.ts",
                    "lineNum": 73,
                    "charNum": 1
                },
                "code": 2364,
                "message": "The left-hand side of an assignment expression must be a variable or a property access."
            },
            {
                "type": 1,
                "at": {
                    "fileName": "fixtures/mock_test.ts",
                    "lineNum": 76
                },
                "message": "\"'q' is not a descriptive variable name.\""
            },
            {
                "type": 0,
                "at": {
                    "fileName": "fixtures/mock_test.ts",
                    "lineNum": 76,
                    "charNum": 5
                },
                "code": 2322,
                "message": "Type 'number' is not assignable to type 'string'."
            },
            {
                "type": 0,
                "at": {
                    "fileName": "fixtures/mock_test.ts",
                    "lineNum": 76,
                    "charNum": 5
                },
                "code": 6133,
                "message": "'q' is declared but its value is never read."
            }
        ];
        _verifyFailures(checker, group7, failures);
        done();
    });

    const group8 = "Fails when not all expected errors occur";
    it(group8, (done) => {

        const failures: FailureInfo[] = [
            {
                "type": 1,
                "at": {
                    "fileName": "fixtures/mock_test.ts",
                    "lineNum": 82
                },
                "message": "/constant|read-only/"
            },
            {
                "type": 1,
                "at": {
                    "fileName": "fixtures/mock_test.ts",
                    "lineNum": 86
                },
                "message": "/constant|read-only/"
            },
            {
                "type": 0,
                "at": {
                    "fileName": "fixtures/mock_test.ts",
                    "lineNum": 86,
                    "charNum": 11
                },
                "code": 2362,
                "message": "The left-hand side of an arithmetic operation must be of type 'any', 'number' or an enum type."
            },
            {
                "type": 1,
                "at": {
                    "fileName": "fixtures/mock_test.ts",
                    "lineNum": 90
                },
                "code": 2363
            }
        ];
        _verifyFailures(checker, group8, failures);
        done();
    });

    const group9 = "Checks each of differing directive syntaxes";
    it(group9, (done) => {

        _verifyFailures(checker, group9, []);
        done();
    });

    const group10 = "Requires expected error only on the expected line";
    it(group10, (done) => {

        const failures: FailureInfo[] = [
            {
                "type": 1,
                "at": {
                    "fileName": "fixtures/mock_test.ts",
                    "lineNum": 102
                },
                "message": "/does not exist/"
            },
            {
                "type": 0,
                "at": {
                    "fileName": "fixtures/mock_test.ts",
                    "lineNum": 104,
                    "charNum": 12
                },
                "code": 2339,
                "message": "Property 'notThere' does not exist on type 'typeof \"fixtures/imports/compiles\"'."
            },
            {
                "type": 0,
                "at": {
                    "fileName": "fixtures/mock_test.ts",
                    "lineNum": 108,
                    "charNum": 5
                },
                "code": 2451,
                "message": "Cannot redeclare block-scoped variable 'z2'."
            }
        ];
        _verifyFailures(checker, group10, failures);
        done();
    });
});

describe("edge cases", () => {

    it("handles end-of-file after group declaration", (done) => {

        const checker = new FailChecker(path.join(__dirname, 'fixtures/eof_after_group.ts'), {
            compilerOptions: tsconfigFile
        });
        checker.run();
        const groups = checker.groups();
        assert.strictEqual(groups.next().value, "Nothing follows this group");
        assert(groups.next().done);
        done();
    });

    it("handles end-of-file after error declaration", (done) => {

        const checker = new FailChecker(path.join(__dirname, 'fixtures/eof_after_error.ts'), {
            compilerOptions: tsconfigFile
        });
        checker.run();
        const failures = checker.failures();
        assert.strictEqual(failures.next().value.type, FailureType.MissingError);
        assert(failures.next().done);
        done();
    });
});

// TBD: unexpected error text should be treated as substring searches

function _verifyFailures(
    checker: FailChecker,
    groupName: string,
    expectedFailures: FailureInfo[]
) {
    // Convert expected failures to expected error strings.

    const expectedErrors = expectedFailures.map(expected => {

        return FailChecker.toErrorString(
            expected.type,
            expected.at,
            expected.code,
            expected.message
        );
    });

    // Verify checker.failures() behavior.

    const actualErrors = <string[]>[];
    for (let failure of checker.failures(testFile, groupName)) {
        actualErrors.push(failure.toErrorString());
    }
    verifyErrorMessages(actualErrors, expectedErrors, 'in failures()');

    // Verify checker.throwCombinedError() behavior.

    if (expectedErrors.length === 0) {
        assert.doesNotThrow(() => {

            checker.throwCombinedError(testFile, groupName);
        });
    }
    else {
        try {
            checker.throwCombinedError(testFile, groupName);
            assert(false, 'expected errors not thrown in throwCombinedError()');
        }
        catch (err) {
            verifyErrorMessages(
                err.message.split(FailChecker.ERROR_DELIM),
                expectedErrors,
                'in throwCombinedError()'
            );
        }
    }

    // Verify checker.throwFirstError() behavior.

    if (expectedErrors.length === 0) {
        assert.doesNotThrow(() => {

            checker.throwFirstError(testFile, groupName);
        });
    }
    else {
        try {
            checker.throwFirstError(testFile, groupName);
            assert(false, 'expected error not thrown in throwFirstError()');
        }
        catch (err) {
            assert.strictEqual(err.message, expectedErrors[0], 'error in throwFirstError()');
        }
    }
}
