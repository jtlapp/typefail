
import 'mocha';
import { assert } from 'chai';
import { join } from 'path';
import * as _ from 'lodash';
import { TypeTest, Failure, FailureType, FileLocation } from '../src';

interface FailureInfo {
    type: FailureType,
    at: FileLocation,
    code?: number,
    message?: string
}

const testDir = join(__dirname, '..');
const testFile = join(__dirname, 'fixtures/mock_test.ts');
const tsconfigFile = join(__dirname, 'fixtures/tsconfig.json');

describe("mockup test", () => {

    const typeTest = new TypeTest([testFile], { compilerOptions: tsconfigFile });
    typeTest.run();

    const group1 = "Passes when there are no expected errors";
    it(group1, (done) => {

        _verifyFailures(typeTest, group1, []);
        done();
    });

    const group2 = "Accepts all same-line errors by default";
    it(group2, (done) => {

        _verifyFailures(typeTest, group2, []);
        done();
    });

    const group3 = "Accepts a single expected error";
    it(group3, (done) => {

        _verifyFailures(typeTest, group3, []);
        done();
    });

    const group4 = "Accepts multiple same-line errors upon matching one";
    it(group4, (done) => {

        _verifyFailures(typeTest, group4, []);
        done();
    });

    const group5 = "Accepts multiple expected same line errors";
    it(group5, (done) => {

        _verifyFailures(typeTest, group5, []);
        done();
    });

    const group6 = "Fails when no expected error occurs";
    it(group6, (done) => {

        const failures: FailureInfo[] = [
            {
                "type": 1,
                "at": {
                    "fileName": "/test/fixtures/mock_test.ts",
                    "lineNum": 58
                },
                "message": "\"Not a real error.\""
            },
            {
                "type": 1,
                "at": {
                    "fileName": "/test/fixtures/mock_test.ts",
                    "lineNum": 60
                },
                "code": 2451
            },
            {
                "type": 1,
                "at": {
                    "fileName": "/test/fixtures/mock_test.ts",
                    "lineNum": 65
                },
                "code": 2451
            },
            {
                "type": 1,
                "at": {
                    "fileName": "/test/fixtures/mock_test.ts",
                    "lineNum": 65
                },
                "code": 2540
            }
        ];
        _verifyFailures(typeTest, group6, failures);
        done();
    });

    const group7 = "Fails when error matches no expected error";
    it(group7, (done) => {

        const failures: FailureInfo[] = [
            {
                "type": 1,
                "at": {
                    "fileName": "/test/fixtures/mock_test.ts",
                    "lineNum": 70
                },
                "code": 2000
            },
            {
                "type": 0,
                "at": {
                    "fileName": "/test/fixtures/mock_test.ts",
                    "lineNum": 70,
                    "charNum": 24
                },
                "code": 2345,
                "message": "Argument of type '32' is not assignable to parameter of type 'string'."
            },
            {
                "type": 1,
                "at": {
                    "fileName": "/test/fixtures/mock_test.ts",
                    "lineNum": 73
                },
                "code": 2000
            },
            {
                "type": 1,
                "at": {
                    "fileName": "/test/fixtures/mock_test.ts",
                    "lineNum": 73
                },
                "code": 2001
            },
            {
                "type": 1,
                "at": {
                    "fileName": "/test/fixtures/mock_test.ts",
                    "lineNum": 73
                },
                "code": 2002
            },
            {
                "type": 0,
                "at": {
                    "fileName": "/test/fixtures/mock_test.ts",
                    "lineNum": 73,
                    "charNum": 1
                },
                "code": 2364,
                "message": "The left-hand side of an assignment expression must be a variable or a property access."
            },
            {
                "type": 1,
                "at": {
                    "fileName": "/test/fixtures/mock_test.ts",
                    "lineNum": 76
                },
                "message": "\"'q' is not a descriptive variable name.\""
            },
            {
                "type": 0,
                "at": {
                    "fileName": "/test/fixtures/mock_test.ts",
                    "lineNum": 76,
                    "charNum": 5
                },
                "code": 2322,
                "message": "Type 'number' is not assignable to type 'string'."
            },
            {
                "type": 0,
                "at": {
                    "fileName": "/test/fixtures/mock_test.ts",
                    "lineNum": 76,
                    "charNum": 5
                },
                "code": 6133,
                "message": "'q' is declared but its value is never read."
            }
        ];
        _verifyFailures(typeTest, group7, failures);
        done();
    });

    const group8 = "Fails when not all expected errors occur";
    it(group8, (done) => {

        const failures: FailureInfo[] = [
            {
                "type": 1,
                "at": {
                    "fileName": "/test/fixtures/mock_test.ts",
                    "lineNum": 82
                },
                "message": "/constant|read-only/"
            },
            {
                "type": 1,
                "at": {
                    "fileName": "/test/fixtures/mock_test.ts",
                    "lineNum": 86
                },
                "message": "/constant|read-only/"
            },
            {
                "type": 0,
                "at": {
                    "fileName": "/test/fixtures/mock_test.ts",
                    "lineNum": 86,
                    "charNum": 11
                },
                "code": 2362,
                "message": "The left-hand side of an arithmetic operation must be of type 'any', 'number' or an enum type."
            },
            {
                "type": 1,
                "at": {
                    "fileName": "/test/fixtures/mock_test.ts",
                    "lineNum": 90
                },
                "code": 2363
            }
        ];
        _verifyFailures(typeTest, group8, failures);
        done();
    });

    const group9 = "Checks each of differing directive syntaxes";
    it(group9, (done) => {

        _verifyFailures(typeTest, group9, []);
        done();
    });

    const group10 = "Requires expected error only on the expected line";
    it(group10, (done) => {

        const failures: FailureInfo[] = [
            {
                "type": 1,
                "at": {
                    "fileName": "/test/fixtures/mock_test.ts",
                    "lineNum": 102
                },
                "message": "/does not exist/"
            },
            {
                "type": 0,
                "at": {
                    "fileName": "/test/fixtures/mock_test.ts",
                    "lineNum": 104,
                    "charNum": 12
                },
                "code": 2339,
                "message": "Property 'notThere' does not exist on type 'typeof \"/test/fixtures/imports/compiles\"'."
            },
            {
                "type": 0,
                "at": {
                    "fileName": "/test/fixtures/mock_test.ts",
                    "lineNum": 108,
                    "charNum": 5
                },
                "code": 2451,
                "message": "Cannot redeclare block-scoped variable 'z2'."
            }
        ];
        _verifyFailures(typeTest, group10, failures);
        done();
    });
});

// TBD: unexpected error text should be treated as substring searches

function _verifyFailures(typeTest: TypeTest, groupName: string, expectedFailures: FailureInfo[]) {

    // Convert expected failures to expected error strings.

    const expectedErrors = expectedFailures.map(expected => {

        const failure = new Failure(expected.type, expected.at, expected.code, expected.message);
        return failure.toErrorString();
    });

    // Verify typeTest.failures() behavior.

    const actualErrors = <string[]>[];
    for (let failure of typeTest.failures(testFile, groupName)) {
        actualErrors.push(failure.toErrorString());
    }
    _verifyMessages(actualErrors, expectedErrors, 'in failures()');

    // Verify typeTest.throwCombinedError() behavior.

    if (expectedErrors.length === 0) {
        assert.doesNotThrow(() => {

            typeTest.throwCombinedError(testFile, groupName);
        });
    }
    else {
        try {
            typeTest.throwCombinedError(testFile, groupName);
            assert(false, 'expected errors not thrown in throwCombinedError()');
        }
        catch (err) {
            _verifyMessages(err.message.split("\n"), expectedErrors, 'in throwCombinedError()');
        }
    }

    // Verify typeTest.throwFirstError() behavior.

    if (expectedErrors.length === 0) {
        assert.doesNotThrow(() => {

            typeTest.throwFirstError(testFile, groupName);
        });
    }
    else {
        try {
            typeTest.throwFirstError(testFile, groupName);
            assert(false, 'expected error not thrown in throwFirstError()');
        }
        catch (err) {
            assert.strictEqual(_normalize(err.message), expectedErrors[0],
                    'error in throwFirstError()');
        }
    }
}

function _verifyMessages(actuals: string[], expecteds: string[], label: string) {

    // Require each actual error to be among the expected errors.

    expecteds = expecteds.slice(); // work with a copy
    for (let actualError of actuals) {
        actualError = _normalize(actualError);
        assert.include(expecteds, actualError, `unexpected error ${label}`);
        expecteds[expecteds.indexOf(actualError)] = '';
    }

    // Require each expected error to be among the actual errors.

    const missingErrors: string[] = [];
    for (let expectedError of expecteds) {
        if (expectedError !== '') {
            missingErrors.push(expectedError);
        }
    }
    assert.deepEqual(missingErrors, [], `expected error is missing ${label}`);
}

function _normalize(errorMessage: string) {
    const testDirRegex = new RegExp(_.escapeRegExp(testDir), 'g');
    return errorMessage.replace(testDirRegex, '');
}