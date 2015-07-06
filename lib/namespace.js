//TODO 解决JSON.stringify 打印出对象的问题

"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; desc = parent = getter = undefined; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; continue _function; } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) subClass.__proto__ = superClass; }

var Namespace = (function (_String) {
  function Namespace(defaultModule) {
    _classCallCheck(this, Namespace);

    _get(Object.getPrototypeOf(Namespace.prototype), "constructor", this).call(this);
    this.namespace = defaultModule ? typeof defaultModule == "string" ? defaultModule.split(":") : defaultModule : [];
  }

  _inherits(Namespace, _String);

  _createClass(Namespace, [{
    key: "push",
    value: function push(name) {
      this.namespace.push(name);
      return this;
    }
  }, {
    key: "pop",
    value: function pop() {
      return this.namespace.pop();
    }
  }, {
    key: "set",
    value: function set(name) {
      if (this.namespace.length == 0) {
        this.namespace.push(name);
      } else {
        this.namespace[this.namespace.length - 1] = name;
      }
      return this;
    }
  }, {
    key: "get",
    value: function get() {
      return this.namespace[this.namespace.length - 1];
    }
  }, {
    key: "parent",
    value: function parent() {
      return this.namespace[this.namespace.length - 2];
    }
  }, {
    key: "clone",
    value: function clone() {
      return new Namespace(this.namespace);
    }
  }, {
    key: "valueOf",
    value: function valueOf() {
      return this.namespace.join(":");
    }
  }, {
    key: "toObject",
    value: function toObject() {
      return this.namespace.join(":");
    }
  }, {
    key: "toString",
    value: function toString() {
      return this.namespace.join(":");
    }
  }]);

  return Namespace;
})(String);

exports["default"] = Namespace;
module.exports = exports["default"];