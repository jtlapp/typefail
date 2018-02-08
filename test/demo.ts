
import * as ts from 'typescript';
import { TypeTest } from '../src';

const compilerOptions = {
    allowUnreachableCode: true,
    module: ts.ModuleKind.CommonJS,
    //strict: true,
    //noImplicitReturns: true,
    //noUnusedLocals: true,
    //noFallthroughCasesInSwitch: true,
    target: ts.ScriptTarget.ES2016
};

const test = new TypeTest(process.argv.slice(2), {
    compilerOptions
});
test.run();

for (let failure of test.failures()) {
    console.log(failure.toErrorString());
}
