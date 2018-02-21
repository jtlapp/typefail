
/* typetest:group "Uniquely errors unexpected-TS2345 and missing-TS2451" */

import * as GoodImport from '../../imports/compiles';
let n = 32;

GoodImport.takesString(n);
// typetest:error 2451
let r: number = n;
r; // used

/* typetest:group "Uniquely errors missing-TS2345 and missing-TS2451" */

// typetest:error 2345
GoodImport.takesString('abc');
// typetest:error 2451
const z = 'xyz';
z; // used
