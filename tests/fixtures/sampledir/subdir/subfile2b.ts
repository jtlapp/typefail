
/* typefail:group "Uniquely errors missing-TS2451 and missing-TS2322" */

import * as GoodImport from '../../imports/compiles';
let n = 32;

// typefail:error 2451
const z = 'xyz';
z; // used
// typefail:error 2322
let q: string = 'xyz';
q; //used

/* typefail:group "Uniquely errors missing-TS2322 and unexpected-TS2345" */

// typefail:error 2322
let r: string = 'xyz';
r; //used
GoodImport.takesString(n);
