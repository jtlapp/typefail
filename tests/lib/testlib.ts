
import { assert } from 'chai';

export interface DirectiveError {
    excerpt: string;
    lineNum: number;
    charNum?: number;
}

export function verifyErrorMessages(actuals: string[], expecteds: string[], label: string) {

    // Require each actual error to be among the expected errors.

    expecteds = expecteds.slice(); // work with a copy
    for (let actualError of actuals) {
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
