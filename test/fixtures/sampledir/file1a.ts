
/* typetest:group "Uniquely errors unexpected-TS2345" */

import * as GoodImport from '../imports/compiles';
let n = 32;

GoodImport.takesString(n);

/* typetest:group "Uniquely errors unexpected-TS2339" */

GoodImport.notThere();
