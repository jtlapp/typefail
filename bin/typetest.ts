
import * as Minimist from 'minimist';
import { join } from 'path';
import { TypeTest, TypeTestError } from '../src';

const help = `
TYPETEST -- A tool for testing Typescript compile-time errors

Heeds typetest directives embedded in source files to test for expected and
unexpected Typescript compile-time errors. Particularly useful for testing
typings -- both type assignments that should not produce errors and type
assignments that should produce errors. Optionally organizes compile-time
expected/unexpected errors into groups for group-level testing and reporting.

Syntax: typetest <option>* <filepath>+

<filepath> - file name or glob expression for file(s) to test, which may be
    expressed relative to the current working directory
<option> - any of the following:

--tsconfig=<file> (-t <file>) - specifies the tscongfig.json file to use
--json[=<spaces>] - output test results to stdout as JSON, indented by <spaces>,
    which defaults to 2. Set <spaces> to 0 to disable new lines and indenting.
--root=<path> - specifies the directory relative which to show all file paths;
    may be expressed relative to the current working directory
--bail (-b) - bail out of testing on first error, instead of showing all errors
--help (-h) - display this help

When no --tsconfig option is provided, the command uses the tsconfig.json
found in the current working directory. If no tsconfig.json occurs in the cwd,
the command uses the tsconfig.json of the nearest containing directory and
outputs a message indicating the tsconfig.json file in use.
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

// Determine the test configuration.

let tsconfigFile = args.tsconfig;
if (typeof tsconfigFile === 'string') {
    tsconfigFile = join(process.cwd(), tsconfigFile);
}
else {
    throw new Error("automatic tsconfig.json locating not yet implemented");
}

let rootPath = args.root;
if (typeof rootPath === 'string') {
    rootPath = join(process.cwd(), rootPath);
}

// Load the indicated files for testing.

const files = args._.map(filepath => join(process.cwd(), filepath));
const typeTest = new TypeTest(files, {
    compilerOptions: tsconfigFile,
    rootPath: rootPath
});
try {
    typeTest.run(args.bail);
}
catch (err) {
    if (err instanceof TypeTestError) {
        console.log(err.message);
        console.log("** failed to perform testing");
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
    console.log(typeTest.json(spaces));
    process.exit(0);
}

// Output the test results.

let totalFailureCount = 0;

for (let file of typeTest.files()) {
    let fileFailureCount = 0;
    console.log(`\n${file}:`);

    for (let group of typeTest.groups(file)) {
        console.log(`\n  ${group}:`);

        try {
            if (args.bail) {
                typeTest.throwFirstError(file, group);
            }
            else {
                typeTest.throwCombinedError(file, group);
            }
            console.log(`    Group test passed`);
        }
        catch (err) {
            if (err instanceof TypeTestError) {
                err.message.split("\n").forEach(message => {

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
