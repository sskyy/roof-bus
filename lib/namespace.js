//TODO 解决JSON.stringify 打印出对象的问题

"use strict";

exports.__esModule = true;

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) subClass.__proto__ = superClass; }

var Namespace = (function (_String) {
  function Namespace(defaultModule) {
    _classCallCheck(this, Namespace);

    _String.call(this);
    this.namespace = defaultModule ? typeof defaultModule == "string" ? defaultModule.split(":") : defaultModule : [];
  }

  _inherits(Namespace, _String);

  Namespace.prototype.push = function push(name) {
    this.namespace.push(name);
    return this;
  };

  Namespace.prototype.pop = function pop() {
    return this.namespace.pop();
  };

  Namespace.prototype.set = function set(name) {
    if (this.namespace.length == 0) {
      this.namespace.push(name);
    } else {
      this.namespace[this.namespace.length - 1] = name;
    }
    return this;
  };

  Namespace.prototype.get = function get() {
    return this.namespace[this.namespace.length - 1];
  };

  Namespace.prototype.parent = function parent() {
    return this.namespace[this.namespace.length - 2];
  };

  Namespace.prototype.clone = function clone() {
    return new Namespace(this.namespace);
  };

  Namespace.prototype.valueOf = function valueOf() {
    return this.namespace.join(":");
  };

  Namespace.prototype.toObject = function toObject() {
    return this.namespace.join(":");
  };

  Namespace.prototype.toString = function toString() {
    return this.namespace.join(":");
  };

  return Namespace;
})(String);

exports["default"] = Namespace;
module.exports = exports["default"];