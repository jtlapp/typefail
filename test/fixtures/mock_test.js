"use strict";
/* typetest:group "Passes when there are no expected errors" */
exports.__esModule = true;
var GoodImport = require("./imports/compiles");
var n = 123; // no error
n; // used
/* typetest:group "Accepts all same-line errors by default" */
// typetest:expect-error
var x = 'abc'; // one error
// typetest:expect-error
var y = 'abc'; // two different errors
/* typetest:group "Accepts a single expected error" */
// typetest:expect-error "Cannot assign to 'GoodImport' because it is not a variable."
GoodImport = 32;
// typetest:expect-error /does not exist/
GoodImport.notThere();
// typetest:expect-error 2345
GoodImport.takesString(32);
/* typetest:group "Accepts multiple same-line errors upon matching one" */
// typetest:expect-error "Type 'null' is not assignable to type 'number'."
var z1 = 'abc'; // two different errors
// typetest:expect-error "Type 'string' cannot be converted to type 'null'."
var z2 = 'abc'; // two different errors
// typetest:expect-error /constant|read-only/
z1 = GoodImport.takesStringReturnsNumber(32); // two errors
// typetest:expect-error 2345
z2 = GoodImport.takesStringReturnsNumber(32); // two errors
/* typetest:group "Accepts multiple expected same line errors" */
// typetest:expect-error /constant|read-only/
// typetest:expect-error 2345
z1 = GoodImport.takesStringReturnsNumber(32); // two errors
// typetest:expect-error /constant|read-only/
// typetest:expect-error 2345
z1 = String(z2) * GoodImport.takesStringReturnsNumber(32); // three errors
// typetest:expect-error 6133, 2345, 2363
var v1 = GoodImport.takesStringReturnsNumber(32) * 'abc'; // three errors (strict)
/* typetest:group "Fails when no expected error occurs" */
// typetest:expect-error "Not a real error."
var notDupped1 = 1;
// typetest:expect-error 2451
var notDupped2 = 2;
notDupped1; // used
notDupped2; // used
// typetest:expect-error 2451, 2540
notDupped1 = 3;
/* typetest:group "Fails when error matches no expected error" */
// typetest:expect-error 2000
GoodImport.takesString(32);
// typetest:expect-error 2000, 2001, 2002
32 = 'abc';
// typetest:expect-error "'q' is not a descriptive variable name."
var q = GoodImport.takesStringReturnsNumber('abc');
/* typetest:group "Fails when not all expected errors occur" */
// typetest:expect-error /constant|read-only/
// typetest:expect-error 2345
GoodImport.takesStringReturnsNumber(32); // only one error
// typetest:expect-error /constant|read-only/
// typetest:expect-error 2345
var r = String(z2) * GoodImport.takesStringReturnsNumber(32); // two errors, one given
r; // used
// typetest:expect-error 6133, 2345, 2363
var v2 = GoodImport.takesStringReturnsNumber(32); // two errors (strict)
/* typetest:group "Checks each of differing directive syntaxes" */
// typetest:expect-error "Type '\"abc\"' is not assignable to type 'number'."
// typetest:expect-error /not assignable/
// typetest:expect-error 2322, 6133
var z3 = 'abc'; // one error
/* typetest:group "Requires expected error only on the expected line" */
// typetest:expect-error /does not exist/
GoodImport.takesString('abc'); // no error here
GoodImport.notThere(); // unexpected error
// typetest:expect-error 2451
var z1 = 1; // should catch this
var z2 = 2; // but not this
