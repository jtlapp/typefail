
import 'mocha';
import { assert } from 'chai';
import { join } from 'path';
import { TypeTest, Failure, FailureType } from '../src';

const TEST_FILENAME = join(__dirname, 'fixtures/no_directives.ts');

describe("directive typetest:expect-error", () => {

    // TBD: test invalid directive names somewhere
    // TBD: test failure to specify a directive name

    it("accepts all same-line errors by default", (done) => {

    });

    it("accepts a single expected error", (done) => {

    });

    it("accepts multiple same-line errors upon matching one", (done) => {

    });

    it("accepts multiple matching same line errors", (done) => {

    });

    it("fails when no error occurs", (done) => {

    });

    it("fails when no matching error occurs", (done) => {

    });

    it("fails when only one of several expected errors occurs", (done) => {

    });

    it("checks each of differing directive syntaxes", (done) => {

    });

    it("errors on unrecognized syntaxes", (done) => {

    });
});
