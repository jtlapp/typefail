
/* typetest:group "Passes when there are no expected errors" */

import * as GoodImport from './imports/compiles';

let n: number = 123; // no error
n; // used

/* typetest:group "Accepts all same-line errors by default" */

// typetest:error
let x: number = 'abc'; // one error

// typetest:error
let y: number = <null>'abc'; // two different errors

/* typetest:group "Accepts a single expected error" */

// typetest:error "Cannot assign to 'GoodImport' because it is not a variable."
GoodImport = 32;

// typetest:error /does not exist/
GoodImport.notThere();

// typetest:error 2345
GoodImport.takesString(32);

/* typetest:group "Accepts multiple same-line errors upon matching one" */

// typetest:error "Type 'null' is not assignable to type 'number'."
const z1: number = <null>'abc'; // two different errors

// typetest:error "Type 'string' cannot be converted to type 'null'."
const z2: number = <null>'abc'; // two different errors

// typetest:error /constant|read-only/
z1 = GoodImport.takesStringReturnsNumber(32); // two errors

// typetest:error 2345
z2 = GoodImport.takesStringReturnsNumber(32); // two errors

/* typetest:group "Accepts multiple expected same line errors" */

// typetest:error /constant|read-only/
// typetest:error 2345
z1 = GoodImport.takesStringReturnsNumber(32); // two errors

// typetest:error /constant|read-only/
// typetest:error 2345
z1 = String(z2) * GoodImport.takesStringReturnsNumber(32); // three errors

// typetest:error 6133, 2345, 2363
let v1 = GoodImport.takesStringReturnsNumber(32) * 'abc'; // three errors (strict)

/* typetest:group "Fails when no expected error occurs" */

// typetest:error "Not a real error."
let notDupped1 = 1;
// typetest:error 2451
let notDupped2 = 2;
notDupped1; // used
notDupped2; // used

// typetest:error 2451, 2540
notDupped1 = 3;

/* typetest:group "Fails when error matches no expected error" */

// typetest:error 2000
GoodImport.takesString(32);

// typetest:error 2000, 2001, 2002
32 = 'abc';

// typetest:error "'q' is not a descriptive variable name."
let q: string = GoodImport.takesStringReturnsNumber('abc');

/* typetest:group "Fails when not all expected errors occur" */

// typetest:error /constant|read-only/
// typetest:error 2345
GoodImport.takesStringReturnsNumber(32); // only one error

// typetest:error /constant|read-only/
// typetest:error 2345
const r = String(z2) * GoodImport.takesStringReturnsNumber(32); // two errors, one given
r; // used

// typetest:error 6133, 2345, 2363
let v2 = GoodImport.takesStringReturnsNumber(32); // two errors (strict)

/* typetest:group "Checks each of differing directive syntaxes" */

// typetest:error "Type '\"abc\"' is not assignable to type 'number'."
// typetest:error /not assignable/
// typetest:error 2322, 6133
let z3: number = 'abc'; // one error

/* typetest:group "Requires expected error only on the expected line" */

// typetest:error /does not exist/
GoodImport.takesString('abc'); // no error here

GoodImport.notThere(); // unexpected error

// typetest:error 2451
let z1 = 1; // should catch this
let z2 = 2; // but not this
