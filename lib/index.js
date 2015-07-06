"use strict";

exports.__esModule = true;

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var _utilJs = require("./util.js");

var _utilJs2 = _interopRequireDefault(_utilJs);

var _namespaceJs = require("./namespace.js");

var _namespaceJs2 = _interopRequireDefault(_namespaceJs);

var _treeJs = require("./tree.js");

var _treeJs2 = _interopRequireDefault(_treeJs);

var _orderedListJs = require("./orderedList.js");

var _orderedListJs2 = _interopRequireDefault(_orderedListJs);

var _runtimeJs = require("./runtime.js");

var _dataJs = require("./data.js");

var _dataJs2 = _interopRequireDefault(_dataJs);

var _errorJs = require("./error.js");

var _errorJs2 = _interopRequireDefault(_errorJs);

var _debugJs = require("./debug.js");

var _debugJs2 = _interopRequireDefault(_debugJs);

var _debugHandlerJs = require("./debug-handler.js");

var _debugHandlerJs2 = _interopRequireDefault(_debugHandlerJs);

//由环境变量决定debug level
var debug = new _debugJs2["default"](null, _debugHandlerJs2["default"]);

var Bus = (function () {
  function Bus() {
    var options = arguments[0] === undefined ? { defaultModule: "_system" } : arguments[0];

    _classCallCheck(this, Bus);

    this.options = options;

    this._mute = new Map();
    this._disable = new Map();
    this._eventListenerMap = new Map();
    this._rexEventListenerMap = new Map();

    //注册时用的
    this._module = new _namespaceJs2["default"]();
    this._blockForWaiting = new Set();
    this._anonymousIndex = 0;
    //

    //凡属要和父bus发生关连的数据都放在runtime里面
    //runtime对象会贯穿整个bus的fire过程
    this._runtime = new _runtimeJs.Runtime({
      stack: [],
      mute: new _runtimeJs.Facade(Map),
      data: new _runtimeJs.Facade(_dataJs2["default"]),
      results: new _runtimeJs.Facade(_treeJs2["default"]),
      errors: []
    });
  }

  Bus.prototype.on = function on(eventName, originListener) {
    var listener = this.normalizeListener(eventName, originListener);
    this.insertListener(listener);
    //this.buildListenerStack(eventName, listener)
    //mute 永远是指的mute某个事件的后代中的事件
    listener.mute && this.muteEvents(listener.mute, "listener", listener.indexName, eventName);
    listener.disable && this.disableListeners(listener.disable, eventName, listener);
  };

  Bus.prototype.off = function off(listener, event) {};

  Bus.prototype.anonymousName = function anonymousName() {
    return "anonymous_" + this._anonymousIndex++;
  };

  Bus.prototype.insertListener = function insertListener(listener) {
    if (!_utilJs2["default"].isString(listener.event) && !_utilJs2["default"].isRegExp(listener.event)) {
      throw new Error("unknown event name type: " + listener.event);
    }

    var map = _utilJs2["default"].isString(listener.event) ? this._eventListenerMap : this._rexEventListenerMap;
    var order = _utilJs2["default"].pick(listener, ["before", "after", "first", "last"]);
    var listenerArg = [listener.indexName, listener, order];

    if (!map.get(listener.event.toString())) {
      map.set(listener.event.toString(), new _orderedListJs2["default"]());
    }

    var listenerList = map.get(listener.event.toString());

    //调整 waitFor 和 blockFor 的顺序，将所有blockFor都转换成其他人的waitFor
    if (listener.blockFor) {

      for (var _iterator = listener.blockFor, _isArray = Array.isArray(_iterator), _i = 0, _iterator = _isArray ? _iterator : _iterator[Symbol.iterator]();;) {
        var _ref;

        if (_isArray) {
          if (_i >= _iterator.length) break;
          _ref = _iterator[_i++];
        } else {
          _i = _iterator.next();
          if (_i.done) break;
          _ref = _i.value;
        }

        var listenerToBlock = _ref;

        if (listenerList.get(listenerToBlock)) {
          //要block的对象已经存在,那就给他增加个waitFor
          _utilJs2["default"].ensureSet(listenerList.get(listenerToBlock), "waitFor", listener.indexName);
        } else {
          //否则加到一个等待列表里
          _utilJs2["default"].ensureSet(this._blockForWaiting, listenerToBlock, listener.indexName);
        }
      }
    }

    //如果有监听器要block现在的监听器
    if (this._blockForWaiting[listener.indexName]) {
      _utilJs2["default"].ensureSet(listener, "waitFor", this._blockForWaiting[listener.indexName]);
      this._blockForWaiting["delete"](listener.indexName);
    }
    //doneTODO 待验证

    map.set(listener.event.toString(), listenerList.insert.apply(listenerList, listenerArg));

    return this;
  };

  Bus.prototype.getListenersFor = function getListenersFor(event) {
    var map = _utilJs2["default"].isString(event) ? this._eventListenerMap : this._rexEventListenerMap;
    return map.get(event);
  };

  Bus.prototype.muteEvents = function muteEvents(muteEventNames, type, source, inEventName) {
    var muteEventNames = [].concat(muteEventNames);

    if (!this._mute.get(inEventName)) {
      this._mute.set(inEventName, new Map());
    }

    var inEventMuteMap = this._mute.get(inEventName);

    muteEventNames.forEach(function (muteEventName) {
      if (!inEventMuteMap.get(muteEventName)) {
        inEventMuteMap.set(muteEventName, new MuteRecord());
      }

      inEventMuteMap.get(muteEventName).add({ target: muteEventName, source: source, type: type, event: inEventName });
    });
  };

  Bus.prototype.disableListeners = function disableListeners(listenerNames, fireEventName, listener) {
    listenerNames = [].concat(listenerNames);
    if (!this._disable.get(fireEventName)) {
      this._disable.set(fireEventName, new Map());
    }

    var disableMap = this._disable.get(fireEventName);
    listenerNames.forEach(function (listenerName) {
      if (!disableMap.get(listenerName)) {
        disableMap.set(listenerName, new Set());
      }
      disableMap.get(listenerName).add({ target: listenerName, source: listener.indexName, type: "listener" });
    });
  };

  Bus.prototype.fire = function fire(eventName) {
    for (var _len = arguments.length, data = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
      data[_key - 1] = arguments[_key];
    }

    //fire前需要清空上一次的 runtime 数据(数据树 结果树 调用栈)
    this._runtime.reset();
    var event = this.normalizeEvent(eventName);
    var listeners = this.findListenersForEvent(event.name);

    //处理数据
    this._runtime.data = this._runtime.data.child();

    //因为触发的事件可以重名，所以需要用记录stackIndex，
    //确保后续listener的信息能放入正确的stack对象中。
    var eventStack = this.makeEventStack(event, listeners);
    this._runtime.stack.push(eventStack);
    event._stackIndex = eventStack.index;

    //根据触发条件{mute,disable,target}，依次触发监听器,如果监听器有 waitFor 选项，则将其加入到 waitFor 对象的 promise 中

    //获取监听器返回值
    // 如果返回非 bus.signal, 则继续执行。
    // 如果返回 bus.signal包装过的结果，如果结果是 promise，并且blockFor为all，则暂停遍历。
    // 如果没有结果或者是普通结果， signal{mute,disable,blockFor}, 则动态改变后面的触发条件

    // 如果返回 error, 则立即跳出整个 触发栈
    // 如果返回的是普通的对象，则构建结果树(不是数据树！)

    // 冲突情况: 异步的 waitFor 中返回的结果无法 block 任何
    return this.fireListeners(event, listeners, data);
  };

  Bus.prototype.normalizeEvent = function normalizeEvent(rawEvent) {

    var fireEvent = _utilJs2["default"].isString(rawEvent) ? { name: rawEvent } : rawEvent;
    fireEvent.muteBy = this.getMuteFor(fireEvent.name);
    if (!fireEvent.muteBy) {
      //mute 记录的是后代的事件禁用情况！muteBy记录的时当前的情况
      ["mute", "disable", "target"].forEach(function (key) {
        if (fireEvent[key]) fireEvent[key] = [].concat(fireEvent[key]);
      });

      if (this._mute.get(fireEvent.name)) {
        //如果有listener在此事件中需要禁用后代中的事件
        for (var _iterator2 = this._mute.get(fireEvent.name).values(), _isArray2 = Array.isArray(_iterator2), _i2 = 0, _iterator2 = _isArray2 ? _iterator2 : _iterator2[Symbol.iterator]();;) {
          var _ref2;

          if (_isArray2) {
            if (_i2 >= _iterator2.length) break;
            _ref2 = _iterator2[_i2++];
          } else {
            _i2 = _iterator2.next();
            if (_i2.done) break;
            _ref2 = _i2.value;
          }

          var muteEventRecords = _ref2;

          this.storeRuntimeMute(muteEventRecords.toArray());
        }
      }
      if (fireEvent.mute) {
        fireEvent.mute = [].concat(fireEvent.mute).map(function (muteName) {
          return { target: muteName, source: fireEvent.name, type: "fire" };
        });
      }
      //如果在触发时要禁用后代中的事件
      fireEvent.mute && this.storeRuntimeMute(fireEvent.mute);

      //如果触发时要禁用监听器
      if (fireEvent.disable) {
        fireEvent.disable = new Map([].concat(fireEvent.disable).map(function (targetName) {
          return [targetName, new Set([{ target: targetName, source: fireEvent.name, type: "fire" }])];
        }));
      }
      //如果注册时要禁用监听器
      if (this._disable.get(fireEvent.name)) {
        if (!fireEvent.disable) fireEvent.disable = new Map();
        for (var _iterator3 = this._disable.get(fireEvent.name), _isArray3 = Array.isArray(_iterator3), _i3 = 0, _iterator3 = _isArray3 ? _iterator3 : _iterator3[Symbol.iterator]();;) {
          var _ref3;

          if (_isArray3) {
            if (_i3 >= _iterator3.length) break;
            _ref3 = _iterator3[_i3++];
          } else {
            _i3 = _iterator3.next();
            if (_i3.done) break;
            _ref3 = _i3.value;
          }

          var targetName = _ref3[0];
          var sources = _ref3[1];

          if (!fireEvent.disable.get(targetName)) {
            fireEvent.disable.set(targetName, new Set());
          }
          for (var _iterator4 = sources, _isArray4 = Array.isArray(_iterator4), _i4 = 0, _iterator4 = _isArray4 ? _iterator4 : _iterator4[Symbol.iterator]();;) {
            var _ref4;

            if (_isArray4) {
              if (_i4 >= _iterator4.length) break;
              _ref4 = _iterator4[_i4++];
            } else {
              _i4 = _iterator4.next();
              if (_i4.done) break;
              _ref4 = _i4.value;
            }

            var source = _ref4;

            fireEvent.disable.get(targetName).add(source);
          }
        }
      }

      if (fireEvent.target) {
        fireEvent.target = new Set([].concat(fireEvent.target));
      }
    }

    /*
    {
      eventName
      muteBy Array
      mute Array
      Map {disabledListenerName : Set sources }disable
      Set target
    }
     */
    return fireEvent;
  };

  Bus.prototype.getMuteFor = function getMuteFor(eventName) {
    //永远是从runtime中获取是否被mute了，因为mute永远是对子孙起作用，
    //而子孙是通过runtime传递的
    if (!this._runtime.mute.get(eventName)) return;

    var mute = new MuteRecord();
    if (this._runtime.mute.get(eventName)) {
      //继承祖先事件的mute信息
      mute.concat(this._runtime.mute.get(eventName));
    }

    return mute;
  };

  Bus.prototype.storeRuntimeMute = function storeRuntimeMute(muteObjects) {
    var _this = this;

    //三种mute触发来源，需要利用runtime来获取祖先mute信息
    /*
     1. 注册事件时的listener带的mute
     2. 当前事件触发时带的mute信息 (snapshot) 当前并不会执行任何操作
     3. 祖先事件触发时带的mute信息 (snapshot)
     */
    //始终返回一个新的 mute record 对象

    muteObjects.forEach(function (mute) {
      if (!_this._runtime.mute.get(mute.target)) {
        _this._runtime.mute.set(mute.target, new MuteRecord());
      }

      _this._runtime.mute.get(mute.target).add(mute);
    });
  };

  Bus.prototype.findListenersForEvent = function findListenersForEvent(eventName) {
    // 找到所有匹配的event，字符串和正则
    var listeners = this._eventListenerMap.get(eventName) ? this._eventListenerMap.get(eventName).clone() : new _orderedListJs2["default"]();

    //获取所有匹配到的监听器，并且将正则监听器重新与字符串监听器排序
    for (var _iterator5 = this._rexEventListenerMap, _isArray5 = Array.isArray(_iterator5), _i5 = 0, _iterator5 = _isArray5 ? _iterator5 : _iterator5[Symbol.iterator]();;) {
      var _ref5;

      if (_isArray5) {
        if (_i5 >= _iterator5.length) break;
        _ref5 = _iterator5[_i5++];
      } else {
        _i5 = _iterator5.next();
        if (_i5.done) break;
        _ref5 = _i5.value;
      }

      var rex = _ref5[0];
      var rexEventListener = _ref5[1];

      if (new RegExp(rex).test(eventName)) {
        var order = _utilJs2["default"].pick(rexEventListener, ["before", "after", "first", "last"]);
        var listenerArg = [rexEventListener.indexName, _utilJs2["default"].clone(rexEventListener), order];
        listeners.insert.apply(listeners, listenerArg);
      }
    }

    return listeners;
  };

  Bus.prototype.fireListeners = function fireListeners(event, listeners, data) {
    var _this2 = this;

    //依次触发，通过 snapshot 连接 traceStack, runtime

    //对错误的处理问题参见:https://docs.google.com/document/d/1UW9Lci7KpvPNXLG7n5v_SIEQQOQzIwtHIos44Fl020s/edit?usp=sharing

    //debug.log("fire======",event.name,"listeners:")
    //debug.log( event.disable,[...this._disable.get(event.name).keys()])

    var firePromise = new Promise(function (resolve, reject) {
      if (event.muteBy) {
        return setTimeout(resolve, 1);
      }

      //OrderedList 已经禁止了重名，所以一个event下的listener是不会重名的
      //只记录当前监听器循环中的执行阶段的错误
      //异步阶段的错误在 result 中返回，除非开发者没有return相应的promise
      var results = {};

      listeners.forEachAsync(function (listener, next) {
        //target 和 disable 可以共存
        if (event.target && !event.target.has(listener.indexName)) return next();
        if (event.disable && event.disable.get(listener.indexName)) return next();

        var snapshot = _this2.snapshot(event, listener);
        //处理监听器的 waitFor

        var result;
        if (listener.waitFor) {
          //debug.log("calling listener",listener.indexName, listener.waitFor)
          //如果waitFor的监听器返回的是promise，那么就等其resolve,

          var promiseToWait = [].concat(listener.waitFor).reduce(function (list, waitForName) {
            if (results[waitForName].data instanceof Promise) {
              list.push(results[waitForName].data);
            } else {
              debug.warn(waitForName, "result is not a promise", results[waitForName]);
            }
            return list;
          }, []);

          debug.log(listener.indexName, "must wait for", listener.waitFor, promiseToWait.length);
          //并且把自己的结果也包装成Promise，这样可以继续让其他监听器waitFor
          result = _this2.parseResult(Promise.all(promiseToWait).then(function () {
            var _listener$fn;

            return (_listener$fn = listener.fn).call.apply(_listener$fn, [snapshot].concat(data))
            //这里只能在stackTrace里面做记录，因为promise已经是执行的第二阶段了。
            //throw err 没有用。
            //}).catch(err=>{
            //  throw err
            ;
          }));
        } else {
          //debug.log("calling none waitFor listener",listener.indexName, listener.waitFor)
          try {
            var _listener$fn2;

            result = _this2.parseResult((_listener$fn2 = listener.fn).call.apply(_listener$fn2, [snapshot].concat(data)));
          } catch (e) {
            //任何执行时的错误，可以打断当前的监听器执行循环，并使当前promise reject
            //错误也扔到 results中，之后用来收集到 stack里
            var error = new _errorJs2["default"](500, e);
            results[listener.indexName] = _this2.parseResult(error, {});
            return next(error);
          }

          if (result.data instanceof _errorJs2["default"]) {
            results[listener.indexName] = result;
            return next(result.data);
          }
        }

        //如果返回 BusError，则也认为是执行期错误。

        //暂存一下，后面的waitFor需要用
        results[listener.indexName] = result;

        //debug.log( `result of ${listener.indexName}`,result,result instanceof BusResult )

        //动态处理mute
        if (result.signal.mute) {
          //这里一定要把 mute 放到当前的runtime里面，而不是snapshot。
          //动态mute一定要和order一起使用，应为动态的mute只对后续触发的listener中的子孙事件有效。
          _this2.storeRuntimeMute([].concat(result.signal.mute).map(function (muteName) {
            return { target: muteName, source: listener.indexName, type: "call" };
          }));
        }

        //动态处理disable
        if (result.signal.disable !== undefined) {
          if (!event.disable) event.disable = new Map();
          var disableNames = [].concat(result.signal.disable);
          disableNames.forEach(function (disableName) {
            if (!event.disable.get(disableName)) event.disable.set(disableName, new Set());
            event.disable.get(disableName).add({ target: disableName, source: listener.indexName, type: "call" });
          });
        }

        //动态处理blockFor
        if (result.signal.blockFor) {
          [].concat(result.signal.blockFor).forEach(function (blockForName) {
            //debug.log("blocking",blockForName)
            var listenerToBlock = listeners.get(blockForName);
            if (listenerToBlock) {
              if (!listenerToBlock.waitFor) listenerToBlock.waitFor = new Set();
              listenerToBlock.waitFor.add(listener.indexName);
            } else {
              console.warn("listener not called in this event", blockForName);
            }
          });
        }

        //处理snapshot的destroy
        if (result.data && result.data instanceof Promise) {
          result.data.then(function () {
            snapshot.destroy();
          })["catch"](function (e) {
            snapshot.destroy();
            throw e;
          });
        } else {
          snapshot.destroy();
        }

        next();
      }, (function allDone(err) {
        //debug.log("fire done",event.name)
        if (err) {
          if (!(err instanceof _errorJs2["default"])) {
            err = new _errorJs2["default"](500, err);
          }
        }

        //都执行完之后，
        for (var listenerIndexName in results) {
          this._runtime.stack[event._stackIndex].listeners[listenerIndexName].result = results[listenerIndexName];
        }

        //任何执行期的错误，打断当前循环，并且使promise reject
        if (err) {
          debug.error(err);
          return reject(err);
        }

        //当所有监听器的第二阶段也执行完之后，再决定当前的promise是resolve还是reject
        Promise.all(_utilJs2["default"].values(results).map(function (result) {
          return result.data;
        })).then(resolve)["catch"](reject);
      }).bind(_this2));
    });

    //提供默认的this指针
    this.bindThisToResolver(firePromise);

    return firePromise;
  };

  Bus.prototype.bindThisToResolver = function bindThisToResolver(promise) {
    var _this3 = this;

    var _then = promise.then;
    promise.then = function () {
      for (var _len2 = arguments.length, args = Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
        args[_key2] = arguments[_key2];
      }

      args = args.map(function (arg) {
        return arg.bind(_this3);
      });
      return _then.call.apply(_then, [promise].concat(args));
    };
    return promise;
  };

  Bus.prototype.parseResult = function parseResult(result) {
    if (result instanceof BusResult) return result;

    return this.result(result, {});
  };

  Bus.prototype.snapshot = function snapshot(event, listener) {
    var snapshot = { _isSnapshot: true };
    _utilJs2["default"].extend(snapshot, _utilJs2["default"].clone(this));

    snapshot.__proto__ = this.__proto__;

    var liftedMuteClone = new Map([].concat(this._runtime.mute).map(function (_ref8) {
      var k = _ref8[0];
      var v = _ref8[1];

      v.clone().lift();
      return [k, v];
    }));

    //对当前的listener创建一个新的stack，用来记录其中触发的event
    //debug.log( Object.keys(this._runtime.stack[event._stackIndex].listeners), listener.indexName)
    //debug.log(listener.indexName, this._runtime.stack[event._stackIndex].listeners[listener.indexName])
    this._runtime.stack[event._stackIndex].listeners[listener.indexName].stack = [];

    //注意 snapshot 时是不用调用data.child()的，因为同级snapshot共享数据
    snapshot._runtime = {
      reset: function noop() {},
      mute: liftedMuteClone,
      data: this._runtime.data,
      stack: this._runtime.stack[event._stackIndex].listeners[listener.indexName].stack
    };

    snapshot.destroy = function () {
      this._isDestoryed = true;
      for (var i in this) {
        delete this[i];
      }
      this.__proto__ = null;
    };

    return snapshot;
  };

  Bus.prototype.fcall = function fcall(event, listener) {};

  Bus.prototype.then = function then(fn) {};

  Bus.prototype["catch"] = function _catch(fn) {};

  Bus.prototype.result = function result(data) {
    var signal = arguments[1] === undefined ? {} : arguments[1];

    if (arguments.length == 1) {
      signal = data;
      data = undefined;
    }
    return new BusResult(data, signal);
  };

  Bus.prototype.error = function error(code, data) {
    return new _errorJs2["default"](code, data);
  };

  Bus.prototype.getRegisteredEvents = function getRegisteredEvents() {};

  Bus.prototype.makeEventStack = function makeEventStack(event, listenersOrderedList) {
    var eventStack = {};
    eventStack.event = _utilJs2["default"].cloneDeep(event);
    eventStack.$class = "event";

    var clonedListenerArray = _utilJs2["default"].cloneDeep(listenersOrderedList.toArray(), function (item) {
      if (item instanceof Set) {
        return [].concat(item);
      } else if (item instanceof Map) {
        return _utilJs2["default"].zipObject([].concat(item.keys()), [].concat(item.values()));
      } else if (item instanceof Function) {
        return "[Function " + item.name + "]";
      }
    }).map(function (listener) {
      listener.$class = "listener";
      return listener;
    });

    eventStack.listeners = _utilJs2["default"].zipObject(clonedListenerArray.map(function (listener) {
      return listener.indexName;
    }), clonedListenerArray);

    eventStack.index = this._runtime.stack.length;
    return eventStack;
  };

  Bus.prototype.normalizeListener = function normalizeListener(eventName, listener) {
    listener = _utilJs2["default"].isFunction(listener) ? { fn: listener } : listener;
    listener.event = eventName;

    //change plain string to Namespace object
    if (!listener.module) {
      listener.module = this._module.clone();
    } else {
      if (listener.module !== this._module.toString()) {
        listener.vendor = this._module.clone();
      } else {
        listener.module = new _namespaceJs2["default"](listener.module);
      }
    }

    if (listener.before) {
      listener.before = new Set([].concat(listener.before));
    }

    if (listener.after) {
      listener.after = new Set([].concat(listener.after));
    }

    if (listener.blockFor) {
      listener.blockFor = new Set([].concat(listener.blockFor));

      if (!listener.before) listener.before = new Set();
      for (var _iterator6 = listener.blockFor, _isArray6 = Array.isArray(_iterator6), _i6 = 0, _iterator6 = _isArray6 ? _iterator6 : _iterator6[Symbol.iterator]();;) {
        var _ref6;

        if (_isArray6) {
          if (_i6 >= _iterator6.length) break;
          _ref6 = _iterator6[_i6++];
        } else {
          _i6 = _iterator6.next();
          if (_i6.done) break;
          _ref6 = _i6.value;
        }

        var blockForName = _ref6;

        listener.before.add(blockForName);
      }
    }

    if (listener.waitFor) {
      listener.waitFor = new Set([].concat(listener.waitFor));

      if (!listener.after) listener.after = new Set();
      for (var _iterator7 = listener.waitFor, _isArray7 = Array.isArray(_iterator7), _i7 = 0, _iterator7 = _isArray7 ? _iterator7 : _iterator7[Symbol.iterator]();;) {
        var _ref7;

        if (_isArray7) {
          if (_i7 >= _iterator7.length) break;
          _ref7 = _iterator7[_i7++];
        } else {
          _i7 = _iterator7.next();
          if (_i7.done) break;
          _ref7 = _i7.value;
        }

        var waitForName = _ref7;

        listener.after.add(waitForName);
      }
    }

    if (!listener.name) {
      listener.name = listener.fn.name || this.anonymousName();
    }

    listener.indexName = listener.module.toString() ? "" + listener.module.toString() + "." + listener.name : listener.name;

    return listener;
  };

  _createClass(Bus, [{
    key: "data",
    get: function () {
      return this._runtime.data;
    }
  }]);

  return Bus;
})();

exports["default"] = Bus;

var BusResult = function BusResult(data, signal) {
  _classCallCheck(this, BusResult);

  this.$class = data === null || data === undefined ? data : data.constructor.name;
  this.data = data;
  this.signal = signal;
};

var MuteRecord = (function () {
  function MuteRecord() {
    var mutes = arguments[0] === undefined ? [] : arguments[0];

    _classCallCheck(this, MuteRecord);

    this._mutes = mutes;
  }

  MuteRecord.prototype.add = function add(mute) {
    this._mutes.push(mute);
  };

  MuteRecord.prototype.concat = function concat(mutes) {
    if (mutes instanceof MuteRecord) {
      this._mutes = this._mutes.concat(mutes._mutes);
    } else {
      this._mutes = this._mutes.concat(mutes);
    }
  };

  MuteRecord.prototype.clone = function clone(cloneFn) {
    return new MuteRecord(_utilJs2["default"].cloneDeep(this._mutes), cloneFn);
  };

  MuteRecord.prototype.lift = function lift() {
    this._mutes.forEach(function (mute) {
      mute.lifted = mute.lifted === undefined ? 1 : mute.lifted + 1;
    });
  };

  MuteRecord.prototype.toArray = function toArray() {
    return _utilJs2["default"].cloneDeep(this._mutes);
  };

  return MuteRecord;
})();

module.exports = exports["default"];
//debug.log("listener to block updated", listenerToBlock, [...listenerToBlock.waitFor])

//TODO

//TODO 当前对象中没有正在触发的监听器

//TODO 当前对象中有触发器，并触发了错误

//TODO