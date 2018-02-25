
import 'mocha';
import { assert } from 'chai';
import { join } from 'path';
import * as ts from 'typescript';
import { FailChecker, CheckerSetupError, ErrorMatching } from '../src';

const tsconfigFile = join(__dirname, 'fixtures/tsconfig.json');
const testFile = join(__dirname, 'fixtures/allowed_matching.ts');

describe("allowed error matching", () => {

    it("allows all error matching be default", (done) => {

        let checker = new FailChecker(testFile, {
            compiler: ts,
            compilerOptions: tsconfigFile
        });
        checker.run();

        assert.doesNotThrow(() => {

            checker.throwCombinedError();
        });
        done();
    });

    it("can restrict to only 'any' error matching", (done) => {

        let checker = new FailChecker(testFile, {
            compiler: ts,
            compilerOptions: tsconfigFile,
            allowedErrorMatching: ErrorMatching.Any
        });
        _verifyAllowables(checker, ['code:5', 'code:8', 'exact:11', 'regex:14']);
        done();
    });

    it("can restrict to only 'code' error matching", (done) => {

        let checker = new FailChecker(testFile, {
            compiler: ts,
            compilerOptions: tsconfigFile,
            allowedErrorMatching: ErrorMatching.Code
        });
        _verifyAllowables(checker, ['any:2', 'exact:11', 'regex:14']);
        done();
    });

    it("can restrict to only 'exact' error matching", (done) => {

        let checker = new FailChecker(testFile, {
            compiler: ts,
            compilerOptions: tsconfigFile,
            allowedErrorMatching: ErrorMatching.Exact
        });
        _verifyAllowables(checker, ['any:2', 'code:5', 'code:8', 'regex:14']);
        done();
    });

    it("can restrict to only 'regex' error matching", (done) => {

        let checker = new FailChecker(testFile, {
            compiler: ts,
            compilerOptions: tsconfigFile,
            allowedErrorMatching: ErrorMatching.Regex
        });
        _verifyAllowables(checker, ['any:2', 'code:5', 'code:8', 'exact:11']);
        done();
    });

    it("can restrict to only 'code' and 'regex' error matching", (done) => {

        let checker = new FailChecker(testFile, {
            compiler: ts,
            compilerOptions: tsconfigFile,
            allowedErrorMatching: ErrorMatching.Code | ErrorMatching.Regex
        });
        _verifyAllowables(checker, ['any:2', 'exact:11']);
        done();
    });
});

function _verifyAllowables(checker: FailChecker, disallowedMatching: string[]) {
    try {
        checker.run(false);
        assert(false, 'expected at least one disallowed directive');
    }
    catch (err) {
        if (!(err instanceof CheckerSetupError)) {
            throw err;
        }
        const disallowed = disallowedMatching.map(spec => {

            const colonPos = spec.indexOf(':');
            return {
                spec: spec,
                matchType: spec.substr(0, colonPos),
                lineNum: parseInt(spec.substr(colonPos + 1)),
                found: false
            }
        });

        // Verify that each occurring error was expected.

        const messages = err.message.split(FailChecker.ERROR_DELIM);
        for (let i = 0; i < messages.length; ++i) {
            const message = messages[i];
            const matches = message.match(/:(\d+)(:\d+)?$/);
            if (matches === null) {
                throw new Error("Expected error is missing line number");
            }
            const lineNum = parseInt(matches[1]);
            let foundAmongDisallowed = false;
            disallowed.forEach(entry => {

                const regex = new RegExp(`does not allow.*${entry.matchType} error matching`);
                if (entry.lineNum === lineNum && regex.test(err.message)) {
                    foundAmongDisallowed = true;
                    entry.found = true;
                }
            });
            assert(foundAmongDisallowed, `unexpected error: ${message}`);
        }

        // Verify that each expected error occurred.

        disallowed.forEach(entry => {

            assert(entry.found, `missing expected error for ${entry.spec}`);
        });
    }
}
