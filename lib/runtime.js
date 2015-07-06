"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
var _bind = Function.prototype.bind;

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) arr2[i] = arr[i]; return arr2; } else { return Array.from(arr); } }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var _utilJs = require("./util.js");

var _utilJs2 = _interopRequireDefault(_utilJs);

function walkObject(data, handler) {
  var path = arguments[2] === undefined ? [] : arguments[2];

  if (_utilJs2["default"].isFunction(data) || !_utilJs2["default"].isObject(data)) return;

  for (var key in data) {
    var subData = data[key];
    //console.log( subData, key)
    var keepWalking = handler(subData, key, path.concat(key)) !== false;
    //console.log( subData, key, keepWalking, path.concat(key))
    keepWalking && walkObject(subData, handler, path.concat(key));
  }
}

var Runtime = (function () {
  function Runtime() {
    var definition = arguments[0] === undefined ? {} : arguments[0];

    _classCallCheck(this, Runtime);

    this._definition = definition;
    this.setup();
  }

  _createClass(Runtime, [{
    key: "initializeData",
    value: function initializeData() {
      return _utilJs2["default"].cloneDeep(this._definition, function (child) {
        if (child instanceof Facade) {
          return new (_bind.apply(child.ctor, [null].concat(_toConsumableArray(child.args))))();
        }
      });
    }
  }, {
    key: "setup",
    value: function setup() {
      _utilJs2["default"].extend(this, this.initializeData());
    }
  }, {
    key: "reset",
    value: function reset() {
      var _this = this;

      //必须destroy,防止有内存泄露
      walkObject(this._definition, function (data, key, path) {
        if (data instanceof Facade) {
          var obj = _utilJs2["default"].getRef(_this, path);
          if (obj && _utilJs2["default"].isFunction(obj.destroy)) {
            obj.destroy();
          }
          //stop walking
          return false;
        }
      });

      //删除, 触发垃圾回收
      for (var keyName in this._definition) {
        delete this[keyName];
      }

      this.setup();
    }
  }]);

  return Runtime;
})();

var Facade = function Facade(ctor) {
  _classCallCheck(this, Facade);

  this.ctor = ctor;

  for (var _len = arguments.length, args = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
    args[_key - 1] = arguments[_key];
  }

  this.args = args;
};

exports.Runtime = Runtime;
exports.Facade = Facade;