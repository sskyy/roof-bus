/*
 改造waiting for 即使新插入的数据处于waiting中，也应该能遍历出来。
 做不到，因为无法确定waiting中的元素到底在遍历的哪个位置。
 不如增加一个api来检测是否还有waiting的元素。
 */

"use strict";

exports.__esModule = true;

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var _lodash = require("lodash");

var _lodash2 = _interopRequireDefault(_lodash);

var OrderedList = (function () {
  function OrderedList() {
    var _this = this;

    var list = arguments[0] === undefined ? [] : arguments[0];

    _classCallCheck(this, OrderedList);

    list = list || [];
    this._list = new Map();
    this.head = null;
    this.tail = null;
    this._waitList = new Map();
    this._defaultInsertCursor = null;
    list.forEach(function (data) {
      _this.insert.apply(_this, data);
    });
  }

  OrderedList.prototype.normalizeOrder = function normalizeOrder(order, key) {
    var _this2 = this;

    /*
     order 的互斥关系:
     1. first last 不能与before after 混用
     2. before 和 after 不能产生循环
     */
    var normalizedOrder = {};
    if (order.first) normalizedOrder.first = true;
    if (order.last) normalizedOrder.last = true;
    if (order.before) normalizedOrder.before = new Set([].concat([].concat(order.before)));
    if (order.after) normalizedOrder.after = new Set([].concat([].concat(order.after)));

    if ((normalizedOrder.first || normalizedOrder.last) && (normalizedOrder.before || normalizedOrder.after)) {
      throw new Error("order `first` and `last` cannot be used with `before` or `after` : " + key);
    }
    var orderNamePair = {
      before: "after",
      after: "before"
    };

    Object.keys(orderNamePair).forEach(function (orderName) {
      var reverseOrderName = orderNamePair[key];
      if (normalizedOrder[orderName]) {
        var orderValues = normalizedOrder[orderName].values();
        for (var _iterator = orderValues, _isArray = Array.isArray(_iterator), _i = 0, _iterator = _isArray ? _iterator : _iterator[Symbol.iterator]();;) {
          var _ref;

          if (_isArray) {
            if (_i >= _iterator.length) break;
            _ref = _iterator[_i++];
          } else {
            _i = _iterator.next();
            if (_i.done) break;
            _ref = _i.value;
          }

          var orderTargetKey = _ref;

          //有我等的对象，也在等我
          if (_this2._waitList[key] && _this2._waitList[key][orderTargetKey]) {
            if (_this2._waitList[key][orderTargetKey][orderName].has(key)) {
              //如果我们互相before或者互相after
              throw new Error(key + " has conflict order  " + orderName + " with " + orderTargetKey);
            } else if (_this2._waitList[key][orderTargetKey][reverseOrderName].has(key)) {
              //如果我before他， 他after我，那就删掉一个
              normalizedOrder[orderName]["delete"](orderTargetKey);
            }
          }
        }
      }
    });

    return normalizedOrder;
  };

  /*
   order 中的before 或者after必须是 数组或者 Set
   */

  OrderedList.prototype.insert = function insert(key, value) {
    var order = arguments[2] === undefined ? {} : arguments[2];

    //TODO before he after 都支持数组形式，对插入的数据使用index来
    if (key === undefined || value === undefined) throw new Error("key and value cannot be undefined");

    order = this.normalizeOrder(order, key);
    var obj = { value: value, key: key, order: order };

    if (this.isDependenciesLoaded(order)) {
      this.store(obj);
      this.storeRelier(obj.key);
    } else {
      this.lineUp(obj);
    }

    return this;
  };

  OrderedList.prototype.store = function store(obj) {
    if (this._list.get(obj.key)) {
      throw new Error(obj.key + " already exist");
    }

    if (this.length === 0) {
      this.head = this.tail = obj;
    } else if (this.hasOrder(obj.order)) {
      obj.order.first && this.applyOrderFirst(obj);
      obj.order.last && this.applyOrderLast(obj);
      obj.order.before && obj.order.before.size && this.applyOrderBefore(obj);
      obj.order.after && obj.order.after.size && this.applyOrderAfter(obj);
    } else {
      this.applyOrderDefault(obj);
    }

    this._list.set(obj.key, obj);
  };

  OrderedList.prototype.hasOrder = function hasOrder(order) {
    return order.first || order.last || order.before && order.before.size || order.after && order.after.size;
  };

  OrderedList.prototype.applyOrderDefault = function applyOrderDefault(obj) {
    //如果没有last元素，那么插在tail后面
    if (!this._defaultInsertCursor) {
      linkAfter(this.tail, obj);
      this.tail = obj;
    } else {
      //如果有last元素 那么插在第一个last的上面
      linkAfter(this._defaultInsertCursor, obj);
      this._defaultInsertCursor = obj;
    }
  };

  OrderedList.prototype.applyOrderFirst = function applyOrderFirst(obj) {
    linkBefore(this.head, obj);
    this.head = obj;
  };

  OrderedList.prototype.applyOrderLast = function applyOrderLast(obj) {
    var result = linkAfter(this.tail, obj);
    this.tail = obj;

    //设置一个默认插入的地方
    if (!this._defaultInsertCursor) this._defaultInsertCursor = obj.prev;

    return result;
  };

  OrderedList.prototype.applyOrderAround = function applyOrderAround(obj, orderName) {
    var orderKeys = Array.from(obj.order[orderName]);
    var aroundWhich = this._list.get(orderKeys[0]);
    var cursor = aroundWhich;
    var candidateKeys = orderKeys.slice(1);

    var headOrTail = orderName === "before" ? "head" : "tail";
    var prevOrNext = orderName === "before" ? "prev" : "next";
    var linkFn = orderName === "before" ? linkBefore : linkAfter;

    if (candidateKeys.length) {
      while (cursor !== this[headOrTail]) {
        cursor = cursor[prevOrNext];
        if (candidateKeys.includes(cursor.key)) aroundWhich = cursor;
      }
    }

    linkFn(aroundWhich, obj);
    if (aroundWhich === this[headOrTail]) this[headOrTail] = obj;
  };

  OrderedList.prototype.applyOrderBefore = function applyOrderBefore(obj) {
    return this.applyOrderAround(obj, "before");
  };

  OrderedList.prototype.applyOrderAfter = function applyOrderAfter(obj) {
    return this.applyOrderAround(obj, "after");
  };

  OrderedList.prototype.storeRelier = function storeRelier(key) {
    if (this._waitList.get(key)) {

      for (var _iterator2 = this._waitList.get(key).values(), _isArray2 = Array.isArray(_iterator2), _i2 = 0, _iterator2 = _isArray2 ? _iterator2 : _iterator2[Symbol.iterator]();;) {
        var _ref2;

        if (_isArray2) {
          if (_i2 >= _iterator2.length) break;
          _ref2 = _iterator2[_i2++];
        } else {
          _i2 = _iterator2.next();
          if (_i2.done) break;
          _ref2 = _i2.value;
        }

        var relier = _ref2;

        relier._waiting["delete"](key);
        if (relier._waiting.size === 0) this.store(relier);
      }
      this._waitList["delete"](key);
    }
  };

  OrderedList.prototype.lineUp = function lineUp(obj) {
    var _this3 = this;

    var waitForKeys = [];
    if (obj.order.before) waitForKeys = waitForKeys.concat(Array.from(obj.order.before));
    if (obj.order.after) waitForKeys = waitForKeys.concat(Array.from(obj.order.after));

    waitForKeys = new Set([].concat(waitForKeys).filter(function (key) {
      return !_this3._list.has(key);
    }));

    obj._waiting = waitForKeys;

    Array.from(obj._waiting).forEach(function (waitForKey) {
      if (!_this3._waitList.has(waitForKey)) {
        _this3._waitList.set(waitForKey, new Map());
      }
      //console.log("setting wailList", obj.key,obj)
      _this3._waitList.get(waitForKey).set(obj.key, obj);
    });
  };

  OrderedList.prototype.isDependenciesLoaded = function isDependenciesLoaded(order) {
    var _this4 = this;

    var dependencies = [];
    if (order.before) dependencies = dependencies.concat([].concat(order.before.values()));
    if (order.after) dependencies = dependencies.concat([].concat(order.after.values()));

    return dependencies.every(function (dependency) {
      return _this4._list.get(dependency);
    });
  };

  OrderedList.prototype.isReady = function isReady() {
    return this._waitList.size === 0;
  };

  OrderedList.prototype.forEach = function forEach(handler) {
    var i = this.head;
    while (i) {
      handler(i.value, i.key);
      i = i.next;
    }
  };

  OrderedList.prototype.toArray = function toArray() {
    var result = [];
    this.forEach(function (value) {
      result.push(value);
    });

    return result;
  };

  OrderedList.prototype.get = function get(key) {
    if (this._list.get(key)) {
      return this._list.get(key).value;
    } else {
      for (var _iterator3 = this._waitList.values(), _isArray3 = Array.isArray(_iterator3), _i3 = 0, _iterator3 = _isArray3 ? _iterator3 : _iterator3[Symbol.iterator]();;) {
        var _ref3;

        if (_isArray3) {
          if (_i3 >= _iterator3.length) break;
          _ref3 = _iterator3[_i3++];
        } else {
          _i3 = _iterator3.next();
          if (_i3.done) break;
          _ref3 = _i3.value;
        }

        var list = _ref3;

        for (var _iterator4 = list.values(), _isArray4 = Array.isArray(_iterator4), _i4 = 0, _iterator4 = _isArray4 ? _iterator4 : _iterator4[Symbol.iterator]();;) {
          var _ref4;

          if (_isArray4) {
            if (_i4 >= _iterator4.length) break;
            _ref4 = _iterator4[_i4++];
          } else {
            _i4 = _iterator4.next();
            if (_i4.done) break;
            _ref4 = _i4.value;
          }

          var obj = _ref4;

          if (obj.key === key) {
            return obj.value;
          }
        }
      }
    }
  };

  OrderedList.prototype.clone = function clone(cloneFn) {
    //TODO 改进TODO算法

    if (!this.isReady()) {
      throw new Error("can not clone unready ordered list");
    }

    var list = new OrderedList();

    var cursor = this.head;
    while (cursor) {
      var order = {};
      if (cursor.order.first) order.first = true;
      if (cursor.order.last) order.last = true;
      if (cursor.order.before) order.before = [].concat(cursor.order.before);
      if (cursor.order.after) order.after = [].concat(cursor.order.after);

      list.insert(cursor.key, _lodash2["default"].cloneDeep(cursor.value, cloneFn), order);
      cursor = cursor.next;
    }

    return list;
  };

  OrderedList.prototype.forEachAsync = function forEachAsync(handler, callback) {
    var root = this;
    var iterationEnd = false;

    function next(i, err) {
      if (err !== undefined) {
        return callback(err);
      }

      if (i !== undefined) {
        try {
          handler(i.value, next.bind(null, i.next));
        } catch (e) {
          //因为next层层try包裹了callback
          //如果callback继续抛出error，就会多次调用callback
          if (!iterationEnd) {
            try {
              iterationEnd = true;
              callback(e);
            } catch (e) {
              throw e;
            }
          } else {
            throw e;
          }
        }
      } else {
        return callback();
      }
    }

    next(root.head);
  };

  _createClass(OrderedList, [{
    key: "length",
    get: function get() {
      return this._list.size;
    }
  }]);

  return OrderedList;
})();

function linkAfter(linkedObj, unLinkedObj) {
  if (!linkedObj || !unLinkedObj) return;
  unLinkedObj.prev = linkedObj;

  if (linkedObj.next) {
    unLinkedObj.next = linkedObj.next;
    unLinkedObj.next.prev = unLinkedObj;
  }

  linkedObj.next = unLinkedObj;
}

function linkBefore(linkedObj, unLinkedObj) {
  if (!linkedObj || !unLinkedObj) return;

  unLinkedObj.next = linkedObj;
  if (linkedObj.prev) {
    unLinkedObj.prev = linkedObj.prev;
    unLinkedObj.prev.next = unLinkedObj;
  }
  linkedObj.prev = unLinkedObj;
}

exports["default"] = OrderedList;
module.exports = exports["default"];