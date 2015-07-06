//TODO 增加环境变量判断level
//TODO 将node的handler和浏览器的handler完全分离

"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var _defaultHandlers = {
    debug: {
        debug: function debug() {
            var _console$log;

            for (var _len = arguments.length, arg = Array(_len), _key = 0; _key < _len; _key++) {
                arg[_key] = arguments[_key];
            }

            return (_console$log = console.log).call.apply(_console$log, [console].concat(arg));
        },
        log: function log() {
            var _console$log2;

            for (var _len2 = arguments.length, arg = Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
                arg[_key2] = arguments[_key2];
            }

            return (_console$log2 = console.log).call.apply(_console$log2, [console].concat(arg));
        }
    },
    info: {
        info: function info() {
            var _console$info;

            for (var _len3 = arguments.length, arg = Array(_len3), _key3 = 0; _key3 < _len3; _key3++) {
                arg[_key3] = arguments[_key3];
            }

            return (_console$info = console.info).call.apply(_console$info, [console].concat(arg));
        }
    },
    warn: {
        warn: function warn() {
            var _console$warn;

            for (var _len4 = arguments.length, arg = Array(_len4), _key4 = 0; _key4 < _len4; _key4++) {
                arg[_key4] = arguments[_key4];
            }

            return (_console$warn = console.warn).call.apply(_console$warn, [console].concat(arg));
        }
    },
    error: {
        error: function error() {
            var _console$error;

            for (var _len5 = arguments.length, arg = Array(_len5), _key5 = 0; _key5 < _len5; _key5++) {
                arg[_key5] = arguments[_key5];
            }

            return (_console$error = console.error).call.apply(_console$error, [console].concat(arg));
        }
    }
};

var Debug = (function () {
    function Debug(level, handlers) {
        var _this = this;

        _classCallCheck(this, Debug);

        this.level = level || "debug";
        this.levelMap = {
            "debug": 0,
            "info": 1,
            "warn": 2,
            "error": 3
        };

        var container = [_defaultHandlers, handlers];
        container.forEach(function (c) {
            if (!c) return;

            for (var handlerLevel in c) {
                for (var handlerName in c[handlerLevel]) {
                    _this.register(handlerLevel, handlerName, c[handlerLevel][handlerName]);
                }
            }
        });
    }

    _createClass(Debug, [{
        key: "register",
        value: function register(level, name, handler) {
            if (this.levelMap[level] >= this.levelMap[this.level]) {
                this[name] = handler;
            }
        }
    }]);

    return Debug;
})();

exports["default"] = Debug;
module.exports = exports["default"];