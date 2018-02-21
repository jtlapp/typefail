
/* typefail:group "Uniquely errors unexpected-TS2345 and unexpected-TS2339" */

import * as GoodImport from '../../imports/compiles';
let n = 32;

GoodImport.takesString(n);
GoodImport.notThere();

/* typefail:group "Uniquely errors unexpected-TS2339 and unexpected-TS2322" */

GoodImport.notThere();
let q: string = n;
q; // used
