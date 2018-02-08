
import * as ts from 'typescript';
import { TypeTest } from '../src';

const test = new TypeTest(process.argv.slice(2), {
    noEmitOnError: true,
    noImplicitAny: true,
    target: ts.ScriptTarget.ES5,
    module: ts.ModuleKind.CommonJS
});
test.run();

for (let failure of test.failures()) {
    console.log(failure.toErrorString());
}
