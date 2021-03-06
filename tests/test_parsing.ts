
import 'mocha';
import { assert } from 'chai';
import { join } from 'path';
import * as ts from 'typescript';
import { FailChecker, FailureType, CheckerSetupError } from '../src';
import { DirectiveError } from './lib/testlib';

const tsconfigFile = join(__dirname, 'fixtures/tsconfig.json');

describe("directives", () => {

    it("parse when they should", (done) => {

        const testFile = join(__dirname, 'fixtures/good_syntax.ts');
        const expectedCounts = require(testFile).counts;
        let checker = new FailChecker(testFile, {
            compiler: ts,
            compilerOptions: tsconfigFile
        });
        checker.run();

        let actualGroupCount = 0;
        for (let group of checker.groups()) {
            ++actualGroupCount;
            const matches = group.match(/\d+/);
            assert.isNotNull(matches);
            assert.strictEqual(parseInt(matches![0]), actualGroupCount);
        }
        assert.strictEqual(actualGroupCount, expectedCounts.groups, 'groups');

        let actualFailureCount = 0;
        for (let failure of checker.failures()) {
            ++actualFailureCount;
            assert.strictEqual(failure.type, FailureType.MissingError);
        }
        assert.strictEqual(actualFailureCount, expectedCounts.failures, 'failures');

        done();
    });

    it("don't parse when they shouldn't", (done) => {

        _verifyErrors('bad_syntax.ts');
        done();
    });

    it("error on invalid semantics", (done) => {

        _verifyErrors('bad_semantics.ts');
        done();
    });

    it("are ignored in unrecognized contexts", (done) => {

        const testFile = join(__dirname, 'fixtures/ignored.ts');
        let checker = new FailChecker(testFile, {
            compiler: ts,
            compilerOptions: tsconfigFile
        });
        checker.run();

        const groups = checker.groups();
        assert.strictEqual(groups.next().value, FailChecker.DEFAULT_GROUP_NAME);
        assert(groups.next().done, "should only be one group");

        const failures = checker.failures();
        assert(failures.next().done, "should be no failures");
        
        done();
    });
});

function _verifyErrors(fixtureFile: string) {
    const testFile = join(__dirname, 'fixtures', fixtureFile);
    // Type not auto-retrieved because fixtures aren't compiled.
    const expectedErrors = <DirectiveError[]>require(testFile).errors;
    let checker = new FailChecker(testFile, {
        compiler: ts,
        compilerOptions: tsconfigFile
    });

    try {
        checker.run(false);
        assert(false, `should have failed on setup (${fixtureFile})`);
    }
    catch (err) {
        if (!(err instanceof CheckerSetupError)) {
            throw err;
        }
        const actualErrors = err.message.split(FailChecker.ERROR_DELIM);

        for (let i = 0; i < expectedErrors.length; ++i) {
            let actual = actualErrors[i];
            let expected = expectedErrors[i];

            // Extract the actual line number and character number.

            const matches = actual.match(/:(\d+)(?::(\d+))?$/);
            assert.isNotNull(matches, `extracting line/char numbers (${fixtureFile})`);
            const actualLineNum = parseInt(matches![1]);
            const actualCharNum = (matches![2] !== undefined ? parseInt(matches![2]) : undefined);

            // Check contents of reported failure.

            assert.strictEqual(actualLineNum, expected.lineNum, `line number (${fixtureFile})`);
            if (expected.charNum !== undefined) {
                assert.strictEqual(actualCharNum, expected.charNum, 
                        `unexpected charNum at line ${actualLineNum} (${fixtureFile})`);
            }
            assert.include(actual, expected.excerpt, `missing excerpt (${fixtureFile})`);
        }
        assert.strictEqual(actualErrors.length, expectedErrors.length,
                `total errors (${fixtureFile})`);
    }
}
