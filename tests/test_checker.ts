
import 'mocha';
import { assert } from 'chai';
import { join } from 'path';
import * as fs from 'fs';
import {
    FailChecker,
    CheckerSetupError,
    Failure
} from '../src';
import { FailureInfo, verifyErrorMessages } from './lib/testlib';

const tsconfigFile = join(__dirname, 'fixtures/tsconfig.json');
const sampleDirFiles = join(__dirname, 'fixtures/sampledir/{,**/}*.ts');
const file1a = 'fixtures/sampledir/file1a.ts';
const file1b = 'fixtures/sampledir/file1b.ts';
const file2a = 'fixtures/sampledir/file2a.ts';
const subfile1a = 'fixtures/sampledir/subdir/subfile1a.ts';
const subfile2a = 'fixtures/sampledir/subdir/subfile2a.ts';
const subfile2b = 'fixtures/sampledir/subdir/subfile2b.ts';

// Run the checker recursively on the sampledir and load the expected result data.

const sampleDirChecker = new FailChecker(sampleDirFiles, {
    compilerOptions: tsconfigFile,
    rootPath: __dirname
});
sampleDirChecker.run();

// Update sampledir.json by running tests/gen_json from the repo directory.
const sampleDirPojo = require('./fixtures/sampledir.json');

const sampleDirMap = new Map<string, Map<string, any>>();
sampleDirPojo.files.forEach((fileData: any) => {

     const groupMap = new Map<string, any>();
     fileData.groups.forEach((groupData: any) => {

         groupMap.set(groupData.group, groupData);
     });
     sampleDirMap.set(fileData.file, groupMap);
});

describe("bailing on setup errors", () => {

    it("bails on first detected setup error", (done) => {

        const checker = new FailChecker(join(__dirname, 'fixtures/setup_errors.ts'), {
            compilerOptions: tsconfigFile,
            rootPath: __dirname
        });
        try {
            checker.run();
            assert(false, "should have gotten a setup error");
        }
        catch (err) {
            if (!(err instanceof CheckerSetupError)) {
                throw err;
            }
            const errors = err.message.split(FailChecker.ERROR_DELIM);
            assert.strictEqual(errors.length, 1);
            assert.match(errors[0], /string parameter/);
        }
        done();
    });

    it("reports all setup errors without bailing", (done) => {

        const checker = new FailChecker(join(__dirname, 'fixtures/setup_errors.ts'), {
            compilerOptions: tsconfigFile,
            rootPath: __dirname
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
            assert.match(errors[0], /string parameter/);
            assert.match(errors[1], /directive name/);
        }
        done();
    });
});

describe("listing loaded files", () => {

    it("lists all files", (done) => {

        const expectedFiles = <string[]>[];
        for (let file of sampleDirMap.keys()) {
            expectedFiles.push(file);
        }
        for (let actualFile of sampleDirChecker.files()) {
            const foundIndex = expectedFiles.indexOf(actualFile);
            assert.isAtLeast(foundIndex, 0, `unexpected file ${actualFile}`);
            expectedFiles[foundIndex] = '';
        }
        expectedFiles.forEach(expectedFile => {

            assert.strictEqual(expectedFile, '', `missing expected file`);
        });
        done();
    });

    it("lists a specified absolute file path", (done) => {

        const absFile1a = join(__dirname, 'fixtures/sampledir/file1a.ts');
        const checker = new FailChecker(absFile1a, {
            compilerOptions: tsconfigFile
        });
        checker.run();
        const filePaths = checker.files(absFile1a);
        assert.deepEqual(filePaths, [absFile1a]);
        done();
    });

    it("lists a specified relative file path", (done) => {

        const filePaths = sampleDirChecker.files(subfile2a);
        assert.deepEqual(filePaths, [subfile2a]);
        done();
    });

    it("lists files by wildcard", (done) => {

        let filePaths = sampleDirChecker.files('fixtures/sampledir/file1*.ts');
        assert.strictEqual(filePaths.length, 2);
        if (filePaths[0] !== file1a) {
            filePaths = [ filePaths[1], filePaths[0] ];
        }
        assert.deepEqual(filePaths, [file1a, file1b]);
        done();
    });
});

describe("testing loaded files", () => {

    it("tests a single file specified as a string", (done) => {

        const checker = new FailChecker(join(__dirname, file1a), {
            compilerOptions: tsconfigFile,
            rootPath: __dirname
        });
        checker.run();
        const expectedErrors = <string[]>[];
        _addExpectedErrors(expectedErrors, file1a);
        _verifyErrors(checker.failures(), expectedErrors, "in single file as string");
        done();
    });

    it("tests a single file specified as an array", (done) => {

        const checker = new FailChecker([join(__dirname, file1b)], {
            compilerOptions: tsconfigFile,
            rootPath: __dirname
        });
        checker.run();
        const expectedErrors = <string[]>[];
        _addExpectedErrors(expectedErrors, file1b);
        _verifyErrors(checker.failures(), expectedErrors, "in single file as array");
        done();
    });

    it("tests multiple individually specified files", (done) => {

        const checker = new FailChecker([
            join(__dirname, file1a),
            join(__dirname, file1b)
        ], {
            compilerOptions: tsconfigFile,
            rootPath: __dirname
        });
        checker.run();
        const expectedErrors = <string[]>[];
        _addExpectedErrors(expectedErrors, file1a);
        _addExpectedErrors(expectedErrors, file1b);
        _verifyErrors(checker.failures(), expectedErrors, "in multiple named files");
        done();
    });

    it("tests files specified by wildcard", (done) => {

        const wildFilePath = 'fixtures/sampledir/file1*.ts';
        const checker = new FailChecker(join(__dirname, wildFilePath), {
            compilerOptions: tsconfigFile,
            rootPath: __dirname
        });
        checker.run();
        const expectedErrors = <string[]>[];
        _addExpectedErrors(expectedErrors, file1a);
        _addExpectedErrors(expectedErrors, file1b);
        _verifyErrors(checker.failures(), expectedErrors, "in files by wildcard");
        done();
    });

    it("tests a mix of specified and wildcard files", (done) => {

        const wildFilePath = 'fixtures/sampledir/subdir/subfile2*.ts';
        const checker = new FailChecker([
            join(__dirname, wildFilePath),
            join(__dirname, file1b)
        ], {
            compilerOptions: tsconfigFile,
            rootPath: __dirname
        });
        checker.run();
        const expectedErrors = <string[]>[];
        _addExpectedErrors(expectedErrors, subfile2a);
        _addExpectedErrors(expectedErrors, subfile2b);
        _addExpectedErrors(expectedErrors, file1b);
        _verifyErrors(checker.failures(), expectedErrors, "in file and wildcard");
        done();
    });

    it("tests files specified by recursive wildcard", (done) => {

        const wildFilePath = 'fixtures/sampledir/{,**/}*.ts';
        const checker = new FailChecker([join(__dirname, wildFilePath)], {
            compilerOptions: tsconfigFile,
            rootPath: __dirname
        });
        checker.run();
        const expectedErrors = <string[]>[];
        _addExpectedErrors(expectedErrors, file1a);
        _addExpectedErrors(expectedErrors, file1b);
        _addExpectedErrors(expectedErrors, file2a);
        _addExpectedErrors(expectedErrors, subfile1a);
        _addExpectedErrors(expectedErrors, subfile2a);
        _addExpectedErrors(expectedErrors, subfile2b);
        _verifyErrors(checker.failures(), expectedErrors, "in files by recursive wildcard");
        done();
    });
});

describe("selectively verifying files", () => {

    it("verifies selected file", (done) => {

        const expectedErrors = <string[]>[];
        _addExpectedErrors(expectedErrors, file1a);
        _verifyErrors(sampleDirChecker.failures(file1a), expectedErrors, "in selected file");
        done();
    });

    it("verifies wildcard selection of files", (done) => {

        const wildcardFile = 'fixtures/sampledir/file1*.ts';
        const expectedErrors = <string[]>[];
        _addExpectedErrors(expectedErrors, file1a);
        _addExpectedErrors(expectedErrors, file1b);
        _verifyErrors(sampleDirChecker.failures(wildcardFile), expectedErrors,
                "in wildcard file selection");
        done();
    });

    it("errors when the selected file is not present", (done) => {

        assert.throws(() => {
            sampleDirChecker.failures("non-existent file").next();
        }, /file.*not found/i);
        done();
    });
});

describe("enumerating groups", () => {

    it("yields all groups of all loaded files", (done) => {

        const expectedGroups = <string[]>[];
        for (let fileData of sampleDirMap.values()) {
            for (let group of fileData.keys()) {
                expectedGroups.push(group);
            }
        }
        _verifyGroups(sampleDirChecker.groups(), expectedGroups);
        done();
    });

    it("a single file not specifying groups yields only default group", (done) => {

        const checker = new FailChecker(join(__dirname, 'fixtures/groups/no_groups_named.ts'), {
            compilerOptions: tsconfigFile
        });
        checker.run();
        const actualGroups = <string[]>[];
        for (let groupName of checker.groups()) {
            actualGroups.push(groupName);
        }
        assert.strictEqual(actualGroups.length, 1);
        assert.strictEqual(actualGroups[0], FailChecker.DEFAULT_GROUP_NAME);
        done();
    });

    it("yields all groups of a single specified file, default group first", (done) => {

        const checker = new FailChecker(
            join(__dirname, 'fixtures/groups/second_group_named.ts'),
            { compilerOptions: tsconfigFile }
        );
        checker.run();
        const actualGroups = <string[]>[];
        for (let groupName of checker.groups()) {
            actualGroups.push(groupName);
        }
        assert.strictEqual(actualGroups.length, 2);
        assert.strictEqual(actualGroups[0], FailChecker.DEFAULT_GROUP_NAME);
        assert.strictEqual(actualGroups[1], "Second group");
        done();
    });

    it("yields all groups of a single specified file, no default group", (done) => {

        const checker = new FailChecker(
            join(__dirname, 'fixtures/groups/both_groups_named.ts'),
            { compilerOptions: tsconfigFile }
        );
        checker.run();
        const actualGroups = <string[]>[];
        for (let groupName of checker.groups()) {
            actualGroups.push(groupName);
        }
        assert.strictEqual(actualGroups.length, 2);
        assert.strictEqual(actualGroups[0], "First group");
        assert.strictEqual(actualGroups[1], "Second group");
        done();
    });

    it("yields all groups of a selected file", (done) => {

        const expectedGroups = <string[]>[];
        const fileData = sampleDirMap.get(file1a);
        for (let group of fileData!.keys()) {
            expectedGroups.push(group);
        }
        _verifyGroups(sampleDirChecker.groups(file1a), expectedGroups);
        done();
    });

    it("yields all groups of selected wildcard files", (done) => {

        const wildcardPath = 'fixtures/sampledir/subdir/subfile2*.ts';
        const expectedGroups = <string[]>[];
        const files = [ subfile2a, subfile2b ];
        files.forEach(file => {

            const fileData = sampleDirMap.get(file);
            for (let group of fileData!.keys()) {
                expectedGroups.push(group);
            }
        });
        _verifyGroups(sampleDirChecker.groups(wildcardPath), expectedGroups);
        done();
    });
});

describe("selectively verifying groups", () => {

    it("verifies groups by name", (done) => {

        let expectedErrors = <string[]>[];
        let groupName = "Uniquely errors unexpected-TS2345 and missing-TS2451";
        _addExpectedErrors(expectedErrors, subfile2a, groupName);
        _verifyErrors(sampleDirChecker.failures(subfile2a, groupName), expectedErrors,
                "in file-group verification 1");
        expectedErrors = <string[]>[];
        groupName = "Uniquely errors missing-TS2345 and missing-TS2451";
        _addExpectedErrors(expectedErrors, subfile2a, groupName);
        _verifyErrors(sampleDirChecker.failures(subfile2a, groupName), expectedErrors,
                "in file-group verification 2");
        done();
    });

    it("verifies default group in file with no code", (done) => {

        const filePath = join(__dirname, 'fixtures/groups/default_group_no_code.ts');
        const checker = new FailChecker(filePath, {
            compilerOptions: tsconfigFile
        });
        checker.run();
        assert(checker.failures().next().done); // no failures anywhere
        const failures = checker.failures(filePath, FailChecker.DEFAULT_GROUP_NAME);
        assert(failures.next().done);
        done();
    });

    it("verifies first group with no code, second with error", (done) => {

        const filePath = join(__dirname, 'fixtures/groups/first_group_no_code.ts');
        const checker = new FailChecker(filePath, {
            compilerOptions: tsconfigFile
        });
        checker.run();

        let failures = checker.failures(filePath, "First group having no code");
        assert(failures.next().done);

        failures = checker.failures(filePath, "Second group having failure");
        assert.strictEqual(failures.next().value.code, 2322);
        assert(failures.next().done);
        done();
    });

    it("verifies first group with error, last with no code", (done) => {

        const filePath = join(__dirname, 'fixtures/groups/last_group_no_code.ts');
        const checker = new FailChecker(filePath, {
            compilerOptions: tsconfigFile
        });
        checker.run();

        let failures = checker.failures(filePath, "First group having failure");
        assert.strictEqual(failures.next().value.code, 2322);
        assert(failures.next().done);

        failures = checker.failures(filePath, "Last group having no code");
        assert(failures.next().done);
        done();
    });

    it("errors when the selected group is not present", (done) => {

        assert.throws(() => {
            sampleDirChecker.failures(file1a, "non-existent group").next();
        }, /group.*not found/i);
        done();
    });
});

describe("generating json", () => {

    it("generates json for a single file", (done) => {

        const checker = new FailChecker(join(__dirname, 'fixtures/sampledir/file1a.ts'), {
            compilerOptions: tsconfigFile,
            rootPath: __dirname
        });
        checker.run();

        const expectedJson = fs.readFileSync(join(__dirname, 'fixtures/sampledir/file1a.json'));
        const actualJson = checker.json() +"\n";
        assert.strictEqual(actualJson, expectedJson.toString(), "single file json");
        done();
    });

    it("generates json for multiple files", (done) => {

        const expectedJson = fs.readFileSync(join(__dirname, 'fixtures/sampledir.json'));
        const actualJson = sampleDirChecker.json() +"\n";
        assert.strictEqual(actualJson, expectedJson.toString(), "multi-file json");
        done();
    });
});

function _addExpectedErrors(expectedErrors: string[], filePath: string, groupName?: string) {
    const groupMap = sampleDirMap.get(filePath);
    if (!groupMap) {
        throw new Error("filePath not found in sampleDirMap");
    }
    if (groupName) {
        _addExpectedGroupErrors(expectedErrors, groupMap.get(groupName));
    }
    else {
        for (let groupName of groupMap.keys()) {
            _addExpectedGroupErrors(expectedErrors, groupMap.get(groupName));
        }
    }
}

function _addExpectedGroupErrors(expectedErrors: string[], groupData: { failures: FailureInfo[] }) {
    groupData.failures.forEach((failure: FailureInfo) => {

        expectedErrors.push(FailChecker.toErrorString(
            failure.type,
            failure.at,
            failure.code,
            failure.message
        ));
    });
}

function _verifyGroups(groupIter: IterableIterator<string>, expectedGroups: string[]) {
    for (let actualGroup of groupIter) {
        const foundIndex = expectedGroups.indexOf(actualGroup);
        assert.isAtLeast(foundIndex, 0, `unexpected group ${actualGroup}`);
        expectedGroups[foundIndex] = '';
    }
    expectedGroups.forEach(expectedGroup => {

        assert.strictEqual(expectedGroup, '', `missing expected group`);
    });
}

function _verifyErrors(failureIter: IterableIterator<Failure>, expecteds: string[], label: string) {
    const actuals = <string[]>[];

    for (let failure of failureIter) {
        actuals.push(failure.toErrorString());
    }
    verifyErrorMessages(actuals, expecteds, label);
}
