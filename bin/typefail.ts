
import * as Minimist from 'minimist';
import * as path from 'path';
import { FailChecker, CheckerError } from '../src';

const help = `
TYPEFAIL -- A tool for testing Typescript compile-time errors

Heeds typefail directives embedded in source files to test for expected and
unexpected Typescript compile-time errors. Particularly useful for testing
typings -- both type assignments that should not produce errors and type
assignments that should produce errors. Optionally organizes compile-time
expected/unexpected errors into groups for group-level testing and reporting.

Syntax: typefail <option>* <source-path>+

<source-path> - file name or glob expression for souce file(s) to test, which
    may be expressed relative to the current working directory
<option> - any of the following:

--tsconfig=<file> (-t <file>) - specifies the tscongfig.json file to use
--json[=<spaces>] - output test results to stdout as JSON, indented by <spaces>,
    which defaults to 2. Set <spaces> to 0 to disable new lines and indenting.
--root=<path> - specifies the directory relative which to show all file paths;
    may be expressed relative to the current working directory
--bail (-b) - bail out of testing on first error, instead of showing all errors
--help (-h) - display this help

When no --tsconfig option is provided, the command uses the tsconfig.json
found in the directory that is common to all of the provided source files. If
no tsconfig.json occurs in this common directory, the command uses the
tsconfig.json of the nearest containing directory of this common directory.
`.trimLeft();

// Process command line, showing help when requested.

const args = Minimist(process.argv.slice(2), {
    alias: {
        b: 'bail',
        h: 'help',
        t: 'tsconfig',
    },
    boolean: [
        'bail',
        'help'
    ],
    string: [
        'tsconfig',
        'json',
        'root'
    ],
    default: { }
});

if (args.help) {
    console.log(help);
    process.exit(0);
}

const sourceFiles = args._.map(filepath => path.join(process.cwd(), filepath));

// Determine the test configuration.

let tsconfigFile = args.tsconfig;
if (typeof tsconfigFile === 'string') {
    tsconfigFile = path.join(process.cwd(), tsconfigFile);
}
else {
    tsconfigFile = FailChecker.findNearestConfigFile(sourceFiles);
    if (tsconfigFile === null) {
        throw new Error("tsconfig.json not found");
    }
}

let rootPath = args.root;
if (typeof rootPath === 'string') {
    rootPath = path.join(process.cwd(), rootPath);
}

// Load the indicated files for testing.

const checker = new FailChecker(sourceFiles, {
    compilerOptions: tsconfigFile,
    rootPath: rootPath
});
try {
    checker.run(args.bail);
}
catch (err) {
    if (err instanceof CheckerError) {
        console.log(err.message);
        console.log("** failed to perform test");
        process.exit(1);
    }
    else {
        throw err;
    }
}

// Output JSON when so requested.

if (typeof args.json === 'string') {
    let spaces = parseInt(args.json);
    if (isNaN(spaces)) {
        spaces = 2;
    }
    console.log(checker.json(spaces));
    process.exit(0);
}

// Output the test results.

let totalFailureCount = 0;

for (let file of checker.files()) {
    let fileFailureCount = 0;
    console.log(`\n${file}:`);

    for (let group of checker.groups(file)) {
        console.log(`\n  ${group}:`);

        try {
            if (args.bail) {
                checker.throwFirstError(file, group);
            }
            else {
                checker.throwCombinedError(file, group);
            }
            console.log(`    Group test passed`);
        }
        catch (err) {
            if (err instanceof CheckerError) {
                err.message.split(FailChecker.ERROR_DELIM).forEach(message => {

                    ++fileFailureCount;
                    console.log(`    ${message}`);
                });
                console.log(`    ** Group test failed`);

                if (args.bail) {
                    console.log(`\n** test failed -- bailing\n`);
                    process.exit(1);
                }
            }
            else {
                throw err;
            }
        }
    }

    if (fileFailureCount === 0) {
        console.log(`  File tests passed.`);
    }
    else {
        console.log(`\n  ** ${fileFailureCount} failures in file`);
    }
    totalFailureCount += fileFailureCount;
}

if (totalFailureCount === 0) {
    console.log(`All tests passed.\n`);
}
else {
    console.log(`\n** ${totalFailureCount} failures total\n`);
}
