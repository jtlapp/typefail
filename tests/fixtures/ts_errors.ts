
// Sampling of detected Typescript errors.

// Mix of good and bad imports.

import * as GoodImport from './imports/compiles';
import { NotThere } from './imports/compiles'; /*TS2305*/
import * as FileNotThere from './imports/notthere'; /*TS2307*/
import * as BadImport from './imports/doesnotcompile';
BadImport; // used

// Bad declarations

declare module 'notthere' { /*TS2664*/
    function doNothing(): void { };
}
export interface ExportedStuff { /*TS2395*/
    exportedThing(): string;
}
interface ExportedStuff { /*TS2395*/
    nonExportedThing(): string;
}

// Bad syntax.

bad syntax; /*TS2304*/
const x = 1 * * 2; /*TS1109*/
const function () { } /*TS1134*/

// Bad type semantics.

abstract class Abstract {
    abstract method(): void;
}
class Foo extends Abstract { } /*TS2515*/

let y: number = 'abc'; /*TS2322*/

GoodImport.takesString(32); /*TS2345*/

function implicitAny(x) { /*strict TS7006*/
    x;
}

// Bad non-type semantics.

const c = 1; /*strict TS6133*/
c = 2; /*TS2540*/

let dup = 1; /*TS2451*/
let dup = 2; /*TS2451*/

function hasUnreachableCode() { /*strict TS6133*/
    return "result";
    return "can't get here"; /*strict TS7027*/
}

// Good code.

let z: number = 6;
z; // used
GoodImport.takesString('xyz');
abstract class Foofoo extends Abstract { }
class Concrete extends Foofoo {
    method() { }
}
new Concrete(); // used
