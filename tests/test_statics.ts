
import 'mocha';
import { assert } from 'chai';
import { join } from 'path';
import { FailChecker, FailureType } from '../src';
import { FailureInfo } from './lib/testlib';

describe("error string generation", () => {

    function toString(errorInfo: FailureInfo) {
        return FailChecker.toErrorString(errorInfo.type, errorInfo.at,
                errorInfo.code, errorInfo.message);
    }

    it("generates missing error strings", (done) => {

        const errInfo: FailureInfo = {
            type: FailureType.MissingError,
            at: {
                fileName: 'dir/file.ts',
                lineNum: 123
            }
        };
        assert.strictEqual(toString(errInfo), "missing error at dir/file.ts:123");

        errInfo.code = 2001;
        assert.strictEqual(toString(errInfo), "missing error TS2001 at dir/file.ts:123");

        errInfo.message = "bad";
        assert.strictEqual(toString(errInfo), "missing error TS2001: bad at dir/file.ts:123");

        errInfo.code = undefined;
        assert.strictEqual(toString(errInfo), "missing error: bad at dir/file.ts:123");

        done();
    });

    it("generates unexpected error strings", (done) => {

        const errInfo: FailureInfo = {
            type: FailureType.UnexpectedError,
            at: {
                fileName: 'dir/file.ts',
                lineNum: 123
            }
        };
        assert.strictEqual(toString(errInfo), "unexpected error at dir/file.ts:123");

        errInfo.code = 2001;
        assert.strictEqual(toString(errInfo), "unexpected error TS2001 at dir/file.ts:123");

        errInfo.message = "bad";
        assert.strictEqual(toString(errInfo), "unexpected error TS2001: bad at dir/file.ts:123");

        errInfo.code = undefined;
        assert.strictEqual(toString(errInfo), "unexpected error: bad at dir/file.ts:123");

        done();
    });
});

describe("finding nearest tsconfig.json", () => {

    const strictConfigFile = join(__dirname, 'fixtures/tsconfig.json');
    const laxConfigFile = join(__dirname, 'fixtures/sampledir/tsconfig.json');
    const badSyntax = join(__dirname, 'fixtures/bad_syntax.ts');
    const goodSyntax = join(__dirname, 'fixtures/good_syntax.ts');
    const file1a = join(__dirname, 'fixtures/sampledir/file1a.ts');
    const file1b = join(__dirname, 'fixtures/sampledir/file1b.ts');
    const file2a = join(__dirname, 'fixtures/sampledir/file2a.ts');
    const subfile1a = join(__dirname, 'fixtures/sampledir/subdir/subfile1a.ts');
    const subfile2a = join(__dirname, 'fixtures/sampledir/subdir/subfile2a.ts');
    const subsubfile1 = join(__dirname, 'fixtures/sampledir/subdir/subsubdir/subsubfile1.ts');

    it("requires absolute paths", (done) => {

        assert.throws(() => {
            FailChecker.findNearestConfigFile([
                '/abc/def',
                'ghi'
            ]);
        }, /must be absolute/);

        assert.throws(() => {
            FailChecker.findNearestConfigFile([
                './abc/def',
                '../ghi'
            ]);
        }, /must be absolute/);

        done();
    });

    it("finds tsconfig in single source directory", (done) => {

        let found = FailChecker.findNearestConfigFile([file1a]);
        assert.strictEqual(found, laxConfigFile);

        found = FailChecker.findNearestConfigFile([file1a, file1b]);
        assert.strictEqual(found, laxConfigFile);

        found = FailChecker.findNearestConfigFile([file1a, file1b, file2a]);
        assert.strictEqual(found, laxConfigFile);

        found = FailChecker.findNearestConfigFile([badSyntax, goodSyntax]);
        assert.strictEqual(found, strictConfigFile);
        done();
    });

    it("finds tsconfig for varying source directories", (done) => {

        let found = FailChecker.findNearestConfigFile([file1a, badSyntax]);
        assert.strictEqual(found, strictConfigFile);

        found = FailChecker.findNearestConfigFile([badSyntax, file1a]);
        assert.strictEqual(found, strictConfigFile);

        found = FailChecker.findNearestConfigFile([badSyntax, subfile1a]);
        assert.strictEqual(found, strictConfigFile);

        found = FailChecker.findNearestConfigFile([badSyntax, subsubfile1]);
        assert.strictEqual(found, strictConfigFile);

        found = FailChecker.findNearestConfigFile([file1a, subsubfile1]);
        assert.strictEqual(found, laxConfigFile);

        done();
    });

    it("finds tsconfig above all source directories", (done) => {

        let found = FailChecker.findNearestConfigFile([subfile1a]);
        assert.strictEqual(found, laxConfigFile);

        found = FailChecker.findNearestConfigFile([subfile1a, subfile2a]);
        assert.strictEqual(found, laxConfigFile);

        found = FailChecker.findNearestConfigFile([subsubfile1]);
        assert.strictEqual(found, laxConfigFile);

        found = FailChecker.findNearestConfigFile([subfile1a, subsubfile1]);
        assert.strictEqual(found, laxConfigFile);

        done();
    });

    it("fails to find a missing tsconfig", (done) => {

        // This test assumes that tsconfig.json doesn't exist above the repo.

        const repoParent = join(__dirname, '../..');
        let found = FailChecker.findNearestConfigFile([repoParent]);
        assert.isNull(found);

        done();
    });
});

// describe("index static API", () => {

// });
