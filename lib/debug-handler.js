"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

var _errorJs = require("./error.js");

var _errorJs2 = _interopRequireDefault(_errorJs);

function redConsole(format) {
    for (var _len = arguments.length, args = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
        args[_key - 1] = arguments[_key];
    }

    console.log.apply(console, ["%c" + format, "color:red"].concat(args));
}

function redDuckTypeConsole(tag, arg) {
    if (typeof arg == "object") {
        redConsole("%s : %O", tag, arg);
    } else {
        redConsole("%s : ", tag, arg);
    }
}

var handlers = {
    error: {
        error: function busErrorHandler() {
            for (var _len2 = arguments.length, args = Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
                args[_key2] = arguments[_key2];
            }

            if (console.group) {
                //浏览器端
                console.group("This is Roof dev message:");

                args.forEach(function (arg) {
                    if (arg instanceof _errorJs2["default"]) {
                        console.group("Roof-Bus error");
                        redConsole("code : %d", arg.code);
                        redDuckTypeConsole("data", arg.data);
                        redDuckTypeConsole("origin", arg.origin);
                        redConsole("stack : %s", arg.stack.join("\n"));

                        console.groupEnd();
                    } else {
                        console.error.call(console, arg);
                    }
                });

                console.groupEnd();
            } else {
                var _console$error;

                return (_console$error = console.error).call.apply(_console$error, [console].concat(args));
            }
        }
    }
};

exports["default"] = handlers;
module.exports = exports["default"];