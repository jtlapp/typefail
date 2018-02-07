
import { assert } from 'chai';
import * as path from 'path';
import { TypeTest } from '../../src';

const testDir = path.dirname(__dirname) + path.delimiter;

export function verifyAllErrors(typeTest: TypeTest, expectedMessages: string[]) {
    _verifyErrors(typeTest, expectedMessages, true);
}

export function verifyTheseErrors(typeTest: TypeTest, expected: string[]) {
    _verifyErrors(typeTest, expected, false);
}

function _verifyErrors(typeTest: TypeTest, expecteds: string[], all: boolean) {

    // Verify typeTest.errors() behavior.

    const errorMessages: string[] = [];
    for (let error of typeTest.errors()) {
        errorMessages.push(error.message);
    }
    _verifyMessages(errorMessages, expecteds, all, 'in errors()');

    // Verify typeTest.throwCombinedError() behavior.

    if (expecteds.length === 0) {
        assert.doesNotThrow(() => {

            typeTest.throwCombinedError();
        });
    }
    else {
        try {
            typeTest.throwCombinedError();
            assert(false, 'expected errors not thrown in throwCombinedError()');
        }
        catch (err) {
            _verifyMessages(err.message.split("\n"), expecteds, all, 'in throwCombinedError()');
        }
    }

    // Verify typeTest.throwFirstError() behavior.

    if (expecteds.length === 0) {
        assert.doesNotThrow(() => {

            typeTest.throwFirstError();
        });
    }
    else {
        try {
            typeTest.throwFirstError();
            assert(false, 'expected error not thrown in throwFirstError()');
        }
        catch (err) {
            assert.strictEqual(_normalize(err.message), expecteds[0], 'error in throwFirstError()');
        }
    }
}

function _verifyMessages(actuals: string[], expecteds: string[], all: boolean, label: string) {

    expecteds = expecteds.slice(); // work with a copy
    for (let actualMessage of actuals) {
        actualMessage = _normalize(actualMessage);
        assert.include(expecteds, actualMessage, label);
        expecteds[expecteds.indexOf(actualMessage)] = '';
    }
    if (all) {
        const missingMessages: string[] = [];
        for (let expectedMessage of expecteds) {
            if (expectedMessage !== '') {
                missingMessages.push(expectedMessage);
            }
        }
        assert.deepEqual(missingMessages, [], `expected messages are missing ${label}`);
    }
}

function _normalize(errorMessage: string) {
    return errorMessage.replace(testDir, '');
}
