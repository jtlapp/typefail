
/* typetest:group "Uniquely errors unexpected-TS2322" */

import * as GoodImport from '../imports/compiles';
let n = 32;

let q: string = n;
q; // used

/* typetest:group "Uniquely errors missing-TS2345" */

// typetest:error 2345
GoodImport.takesString('abc');
