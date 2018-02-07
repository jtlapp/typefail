
import * as demolib from 'imports/demolib';
import * as FileNotThere from 'imports/notthere'; /*ERROR*/
import * as BadImport from 'imports/badimport'; /*ERROR*/
import { NotThere } from 'imports/goodimport'; /*ERROR*/

// Bad declarations

declare module 'notthere' { /*ERROR*/
    function doNothing(): void { };
}
export interface ExportedStuff { /*ERROR*/
    exportedThing(): string;
}
interface ExportedStuff { /*ERROR*/
    nonExportedThing(): string;
}

// Bad syntax

bad syntax; /*ERROR*/
const x = 1 * * 2; /*ERROR*/
const function () { } /*ERROR*/

// Bad semantics

const c = 1; /*ERROR*/
c = 2; /*ERROR*/

abstract class Abstract {
    abstract method(); /*ERROR*/
}
class Foo extends Abstract { } /*ERROR*/

let x:number = 'abc'; /*ERROR*/

demolib.takesString(32); /*ERROR*/

// Good code

let y: number = 6;
y; // used
demolib.takesString('xyz');
abstract class Foofoo extends Abstract { }
class Concrete extends Foofoo {
    method() { }
}
new Concrete(); // used
