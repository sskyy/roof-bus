"use strict";

exports.__esModule = true;

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function isNumber(obj) {
    return typeof obj === "number";
}

var BusError = (function () {
    function BusError(code, data) {
        _classCallCheck(this, BusError);

        if (!isNumber(code)) {
            data = code;
            code = 500;
        }

        this.code = code;
        if (data instanceof Error) {
            this.data = { message: data.message };
            this.stack = data.stack.split(/\n/);
        } else {
            this.data = data;
            //去掉没用的两个stack
            var stackArray = new Error().stack.split(/\n/);
            this.stack = stackArray.slice(0, 1).concat(stackArray.slice(3));
        }

        this.$class = data === undefined || data === null ? "Null" : data.constructor.name;
        this.origin = data;
    }

    BusError.prototype.fixES6 = function fixES6() {};

    return BusError;
})();

exports["default"] = BusError;
module.exports = exports["default"];

//Babel 的 bug