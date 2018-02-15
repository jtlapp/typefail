
import 'mocha';
import { assert } from 'chai';
import { join } from 'path';
import { TypeTest, FailureType, TestSetupError, DEFAULT_GROUP_NAME } from '../src';
import { DirectiveError } from './lib/DirectiveError';

const tsconfigFile = join(__dirname, 'fixtures/tsconfig.json');

describe("directive", () => {

    it("parses when it should", (done) => {

        const testFile = join(__dirname, 'fixtures/good_syntax.ts');
        const expectedCounts = require(testFile).counts;
        let typeTest = new TypeTest([testFile], {
            compilerOptions: tsconfigFile
        });
        typeTest.run();

        let actualGroupCount = 0;
        for (let group of typeTest.groups()) {
            ++actualGroupCount;
            const matches = group.match(/\d+/);
            assert.isNotNull(matches);
            assert.strictEqual(parseInt(matches![0]), actualGroupCount);
        }
        assert.strictEqual(actualGroupCount, expectedCounts.groups, 'groups');

        let actualFailureCount = 0;
        for (let failure of typeTest.failures()) {
            ++actualFailureCount;
            assert.strictEqual(failure.type, FailureType.MissingError);
        }
        assert.strictEqual(actualFailureCount, expectedCounts.failures, 'failures');

        done();
    });

    it("doesn't parse when it shouldn't", (done) => {

        _verifyErrors('bad_syntax.ts');
        done();
    });

    it("errors on invalid semantics", (done) => {

        _verifyErrors('bad_semantics.ts');
        done();
    });

    it("ignored in unrecognized contexts", (done) => {

        const testFile = join(__dirname, 'fixtures/ignored.ts');
        let typeTest = new TypeTest([testFile], {
            compilerOptions: tsconfigFile
        });
        typeTest.run();

        const groups = typeTest.groups();
        assert.strictEqual(groups.next().value, DEFAULT_GROUP_NAME);
        assert(groups.next().done, "should only be one group");

        const failures = typeTest.failures();
        assert(failures.next().done, "should be no failures");
        
        done();
    });
});

function _verifyErrors(fixtureFile: string) {
    const testFile = join(__dirname, 'fixtures', fixtureFile);
    // Type not auto-retrieved because fixtures aren't compiled.
    const expectedErrors = <DirectiveError[]>require(testFile).errors;
    let typeTest = new TypeTest([testFile], {
        compilerOptions: tsconfigFile
    });

    try {
        typeTest.run(false);
        assert(false, `should have failed on setup (${fixtureFile})`);
    }
    catch (err) {
        if (!(err instanceof TestSetupError)) {
            throw err;
        }
        const actualErrors = err.message.split("\n");
        let priorLineNum = 0;

        for (let i = 0; i < expectedErrors.length; ++i) {
            let actual = actualErrors[i];
            let expected = expectedErrors[i];

            // Catch directives that falsely parse at their line numbers.

            const matches = actual.match(/[.]ts:(\d+)/);
            assert.isNotNull(matches, `extracting line number (${fixtureFile})`);
            const failureLineNum = parseInt(matches![1]);
            if (priorLineNum > 0) {
                assert.isAtMost(failureLineNum, priorLineNum + 3,
                        `next line number (${fixtureFile})`);
            }
            priorLineNum = failureLineNum;

            // Check contents of reported failure.

            assert.include(actual, expected.excerpt, `missing excerpt (${fixtureFile})`);
            if (expected.charNum !== undefined) {
                const actualCharNum = parseInt(actual.substr(actual.lastIndexOf(':') + 1));
                assert.strictEqual(actualCharNum, expected.charNum, 
                        `unexpected charNum at line ${failureLineNum} (${fixtureFile})`);
            }
        }
        assert.strictEqual(actualErrors.length, expectedErrors.length,
                `total errors (${fixtureFile})`);
    }
}
