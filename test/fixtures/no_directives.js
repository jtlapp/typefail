"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
exports.__esModule = true;
var demolib = require("imports/demolib");
// Bad syntax
bad;
syntax; /*ERROR*/
var x = 1 *  * 2; /*ERROR*/
var ;
function () { } /*ERROR*/
// Bad semantics
var c = 1; /*ERROR*/
c = 2; /*ERROR*/
var Abstract = /** @class */ (function () {
    function Abstract() {
    }
    return Abstract;
}());
var Foo = /** @class */ (function (_super) {
    __extends(Foo, _super);
    function Foo() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return Foo;
}(Abstract)); /*ERROR*/
var x = 'abc'; /*ERROR*/
demolib.takesString(32); /*ERROR*/
// Good code
var y = 6;
y; // used
demolib.takesString('xyz');
var Foofoo = /** @class */ (function (_super) {
    __extends(Foofoo, _super);
    function Foofoo() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return Foofoo;
}(Abstract));
var Concrete = /** @class */ (function (_super) {
    __extends(Concrete, _super);
    function Concrete() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    Concrete.prototype.method = function () { };
    return Concrete;
}(Foofoo));
new Concrete(); // used
