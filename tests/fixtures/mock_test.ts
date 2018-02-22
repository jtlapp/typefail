
/* typefail:group "Passes when there are no expected errors" */

import * as GoodImport from './imports/compiles';

let n: number = 123; // no error
n; // used

/* typefail:group "Accepts all same-line errors by default" */

// typefail:error
let x: number = 'abc'; // one error

// typefail:error
let y: number = <null>'abc'; // two different errors

/* typefail:group "Accepts a single expected error" */

// typefail:error "Cannot assign to 'GoodImport' because it is not a variable."
GoodImport = 32;

// typefail:error /does not exist/
GoodImport.notThere();

// typefail:error 2345
GoodImport.takesString(32);

/* typefail:group "Accepts multiple same-line errors upon matching one" */

// typefail:error "Type 'null' is not assignable to type 'number'."
const z1: number = <null>'abc'; // two different errors

// typefail:error "Type 'string' cannot be converted to type 'null'."
const z2: number = <null>'abc'; // two different errors

// typefail:error /constant|read-only/
z1 = GoodImport.takesStringReturnsNumber(32); // two errors

// typefail:error 2345
z2 = GoodImport.takesStringReturnsNumber(32); // two errors

/* typefail:group "Accepts multiple expected same line errors" */

// typefail:error /constant|read-only/
// typefail:error 2345
z1 = GoodImport.takesStringReturnsNumber(32); // two errors

// typefail:error /constant|read-only/
// typefail:error 2345
z1 = String(z2) * GoodImport.takesStringReturnsNumber(32); // three errors

// typefail:error 6133, 2345, 2363
let v1 = GoodImport.takesStringReturnsNumber(32) * 'abc'; // three errors (strict)

/* typefail:group "Fails when no expected error occurs" */

// typefail:error "Not a real error."
let notDupped1 = 1;
// typefail:error 2451
let notDupped2 = 2;
notDupped1; // used
notDupped2; // used

// typefail:error 2451, 2540
notDupped1 = 3;

/* typefail:group "Fails when error matches no expected error" */

// typefail:error 2000
GoodImport.takesString(32);

// typefail:error 2000, 2001, 2002
32 = 'abc';

// typefail:error "'q' is not a descriptive variable name."
let q: string = GoodImport.takesStringReturnsNumber('abc');

/* typefail:group "Fails when not all expected errors occur" */

// typefail:error /constant|read-only/
// typefail:error 2345
GoodImport.takesStringReturnsNumber(32); // only one error

// typefail:error /constant|read-only/
// typefail:error 2345
const r = String(z2) * GoodImport.takesStringReturnsNumber(32); // two errors, one given
r; // used

// typefail:error 6133, 2345, 2363
let v2 = GoodImport.takesStringReturnsNumber(32); // two errors (strict)

/* typefail:group "Checks each of differing directive syntaxes" */

// typefail:error "Type '\"abc\"' is not assignable to type 'number'."
// typefail:error /not assignable/
// typefail:error 2322, 6133
let z3: number = 'abc'; // one error

/* typefail:group "Requires expected error only on the expected line" */

// typefail:error /does not exist/
GoodImport.takesString('abc'); // no error here

GoodImport.notThere(); // unexpected error

// typefail:error 2451
let z1 = 1; // should catch this
let z2 = 2; // but not this
