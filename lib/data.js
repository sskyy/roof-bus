"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var _utilJs = require("./util.js");

var _utilJs2 = _interopRequireDefault(_utilJs);

function isObject(obj) {
  return typeof obj === "object";
}

function getRef(obj, name) {
  var ns = name.split("."),
      ref = obj,
      currentName;

  while (currentName = ns.shift()) {
    if (isObject(ref) && ref[currentName]) {
      ref = ref[currentName];
    } else {
      ref = undefined;
      break;
    }
  }

  return ref;
}

function setRef(obj, name, data) {
  var overwrite = arguments[3] === undefined ? false : arguments[3];

  var ns = name.split("."),
      ref = obj,
      currentName;

  while (currentName = ns.shift()) {
    if (ns.length == 0) {
      if (isObject(ref[currentName])) {
        _utilJs2["default"].merge(ref[currentName], data);
      } else {
        if (ref[currentName] !== undefined && !overwrite) {
          throw new Error("you should set argument overwrite to true, if you want to change a exist data.");
        }
        ref[currentName] = data;
      }
    } else {
      if (!isObject(ref[currentName])) {
        if (ref[currentName] !== undefined && !overwrite) {
          throw new Error("you should set argument overwrite to true, if you want to change a exist data.");
        }
        ref[currentName] = {};
      }
      ref = ref[currentName];
    }
  }
}

var Data = (function () {
  function Data(global) {
    _classCallCheck(this, Data);

    if (global) {
      this.global = global;
    } else {
      //循环引用，防止用户不知道自己在顶层。
      //全局应该只有一个这样的数据对象
      this.global = this;
    }

    this.data = {};
  }

  _createClass(Data, [{
    key: "set",
    value: function set(key, data) {
      setRef(this.data, key, data);
    }
  }, {
    key: "overwrite",
    value: function overwrite(key, data) {
      setRef(this.data, key, data, true);
    }
  }, {
    key: "get",
    value: function get(key) {
      return getRef(this.data, key);
    }
  }, {
    key: "child",
    value: function child() {
      return new Data(this.global || this);
    }
  }, {
    key: "destroy",

    //一定要有destroy，runtime在reset时会调用
    //清除循环引用，防止内存泄露
    value: function destroy() {
      this.global = null;
      this.data = null;
    }
  }]);

  return Data;
})();

exports["default"] = Data;
module.exports = exports["default"];