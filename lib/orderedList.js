"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) arr2[i] = arr[i]; return arr2; } else { return Array.from(arr); } }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var _util = require("./util");

var _util2 = _interopRequireDefault(_util);

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
      _this.insert.apply(_this, _toConsumableArray(data));
    });
  }

  _createClass(OrderedList, [{
    key: "normalizeOrder",
    value: function normalizeOrder(order, key) {
      var _this2 = this;

      /*
       order 的互斥关系:
       1. first last 不能与before after 混用
       2. before 和 after 不能产生循环
       */
      var normalizedOrder = {};
      if (order.first) normalizedOrder.first = true;
      if (order.last) normalizedOrder.last = true;
      if (order.before) normalizedOrder.before = new Set([].concat([].concat(_toConsumableArray(order.before))));
      if (order.after) normalizedOrder.after = new Set([].concat([].concat(_toConsumableArray(order.after))));

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
          var _iteratorNormalCompletion = true;
          var _didIteratorError = false;
          var _iteratorError = undefined;

          try {
            for (var _iterator = orderValues[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
              var orderTargetKey = _step.value;

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
          } catch (err) {
            _didIteratorError = true;
            _iteratorError = err;
          } finally {
            try {
              if (!_iteratorNormalCompletion && _iterator["return"]) {
                _iterator["return"]();
              }
            } finally {
              if (_didIteratorError) {
                throw _iteratorError;
              }
            }
          }
        }
      });

      return normalizedOrder;
    }
  }, {
    key: "insert",

    /*
     order 中的before 或者after必须是 数组或者 Set
     */
    value: function insert(key, value) {
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
    }
  }, {
    key: "store",
    value: function store(obj) {
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
    }
  }, {
    key: "hasOrder",
    value: function hasOrder(order) {
      return order.first || order.last || order.before && order.before.size || order.after && order.after.size;
    }
  }, {
    key: "applyOrderDefault",
    value: function applyOrderDefault(obj) {
      //如果没有last元素，那么插在tail后面
      if (!this._defaultInsertCursor) {
        linkAfter(this.tail, obj);
        this.tail = obj;
      } else {
        //如果有last元素 那么插在第一个last的上面
        linkAfter(this._defaultInsertCursor, obj);
        this._defaultInsertCursor = obj;
      }
    }
  }, {
    key: "applyOrderFirst",
    value: function applyOrderFirst(obj) {
      linkBefore(this.head, obj);
      this.head = obj;
    }
  }, {
    key: "applyOrderLast",
    value: function applyOrderLast(obj) {
      var result = linkAfter(this.tail, obj);
      this.tail = obj;

      //设置一个默认插入的地方
      if (!this._defaultInsertCursor) this._defaultInsertCursor = obj.prev;

      return result;
    }
  }, {
    key: "applyOrderAround",
    value: function applyOrderAround(obj, orderName) {
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
    }
  }, {
    key: "applyOrderBefore",
    value: function applyOrderBefore(obj) {
      return this.applyOrderAround(obj, "before");
    }
  }, {
    key: "applyOrderAfter",
    value: function applyOrderAfter(obj) {
      return this.applyOrderAround(obj, "after");
    }
  }, {
    key: "storeRelier",
    value: function storeRelier(key) {
      if (this._waitList.get(key)) {
        var _iteratorNormalCompletion2 = true;
        var _didIteratorError2 = false;
        var _iteratorError2 = undefined;

        try {

          for (var _iterator2 = this._waitList.get(key).values()[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
            var relier = _step2.value;

            relier._waiting["delete"](key);
            if (relier._waiting.size === 0) this.store(relier);
          }
        } catch (err) {
          _didIteratorError2 = true;
          _iteratorError2 = err;
        } finally {
          try {
            if (!_iteratorNormalCompletion2 && _iterator2["return"]) {
              _iterator2["return"]();
            }
          } finally {
            if (_didIteratorError2) {
              throw _iteratorError2;
            }
          }
        }

        this._waitList["delete"](key);
      }
    }
  }, {
    key: "lineUp",
    value: function lineUp(obj) {
      var _this3 = this;

      var waitForKeys = [];
      if (obj.order.before) waitForKeys = waitForKeys.concat(Array.from(obj.order.before));
      if (obj.order.after) waitForKeys = waitForKeys.concat(Array.from(obj.order.after));

      waitForKeys = new Set([].concat(_toConsumableArray(waitForKeys)).filter(function (key) {
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
    }
  }, {
    key: "isDependenciesLoaded",
    value: function isDependenciesLoaded(order) {
      var _this4 = this;

      var dependencies = [];
      if (order.before) dependencies = dependencies.concat([].concat(_toConsumableArray(order.before.values())));
      if (order.after) dependencies = dependencies.concat([].concat(_toConsumableArray(order.after.values())));

      return dependencies.every(function (dependency) {
        return _this4._list.get(dependency);
      });
    }
  }, {
    key: "isReady",
    value: function isReady() {
      return this._waitList.size === 0;
    }
  }, {
    key: "forEach",
    value: function forEach(handler) {
      var i = this.head;
      while (i) {
        handler(i.value);
        i = i.next;
      }
    }
  }, {
    key: "toArray",
    value: function toArray() {
      var result = [];
      this.forEach(function (value) {
        result.push(value);
      });

      return result;
    }
  }, {
    key: "get",
    value: function get(key) {
      if (this._list.get(key)) {
        return this._list.get(key).value;
      } else {
        var _iteratorNormalCompletion3 = true;
        var _didIteratorError3 = false;
        var _iteratorError3 = undefined;

        try {
          for (var _iterator3 = this._waitList.values()[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
            var list = _step3.value;
            var _iteratorNormalCompletion4 = true;
            var _didIteratorError4 = false;
            var _iteratorError4 = undefined;

            try {
              for (var _iterator4 = list.values()[Symbol.iterator](), _step4; !(_iteratorNormalCompletion4 = (_step4 = _iterator4.next()).done); _iteratorNormalCompletion4 = true) {
                var obj = _step4.value;

                if (obj.key === key) {
                  return obj.value;
                }
              }
            } catch (err) {
              _didIteratorError4 = true;
              _iteratorError4 = err;
            } finally {
              try {
                if (!_iteratorNormalCompletion4 && _iterator4["return"]) {
                  _iterator4["return"]();
                }
              } finally {
                if (_didIteratorError4) {
                  throw _iteratorError4;
                }
              }
            }
          }
        } catch (err) {
          _didIteratorError3 = true;
          _iteratorError3 = err;
        } finally {
          try {
            if (!_iteratorNormalCompletion3 && _iterator3["return"]) {
              _iterator3["return"]();
            }
          } finally {
            if (_didIteratorError3) {
              throw _iteratorError3;
            }
          }
        }
      }
    }
  }, {
    key: "clone",
    value: function clone(cloneFn) {
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
        if (cursor.order.before) order.before = [].concat(_toConsumableArray(cursor.order.before));
        if (cursor.order.after) order.after = [].concat(_toConsumableArray(cursor.order.after));

        list.insert(cursor.key, _util2["default"].cloneDeep(cursor.value, cloneFn), order);
        cursor = cursor.next;
      }

      return list;
    }
  }, {
    key: "forEachAsync",
    value: function forEachAsync(handler, callback) {
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
    }
  }, {
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