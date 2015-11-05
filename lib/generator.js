"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _slicedToArray = (function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; })();

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) arr2[i] = arr[i]; return arr2; } else { return Array.from(arr); } }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var _utilJs = require("./util.js");

var _utilJs2 = _interopRequireDefault(_utilJs);

var _lodash = require("lodash");

var _lodash2 = _interopRequireDefault(_lodash);

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

var _co = require("co");

var _co2 = _interopRequireDefault(_co);

function isGenerator(fn) {
    return fn.constructor.name === 'GeneratorFunction';
}

//由环境变量决定debug level
var debug = new _debugJs2["default"](null, _debugHandlerJs2["default"]);

var Bus = (function () {
    function Bus() {
        var options = arguments.length <= 0 || arguments[0] === undefined ? { defaultModule: "_system" } : arguments[0];

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

    _createClass(Bus, [{
        key: "on",
        value: function on(eventName, originListener) {
            var listener = this.normalizeListener(eventName, originListener);
            this.insertListener(listener);
            //this.buildListenerStack(eventName, listener)
            //mute 永远是指的mute某个事件的后代中的事件
            listener.mute && this.muteEvents(listener.mute, "listener", listener.indexName, eventName);
            listener.disable && this.disableListeners(listener.disable, eventName, listener);
        }
    }, {
        key: "off",
        value: function off(listener, event) {}
    }, {
        key: "anonymousName",
        value: function anonymousName() {
            return "anonymous_" + this._anonymousIndex++;
        }
    }, {
        key: "insertListener",
        value: function insertListener(listener) {
            if (!_lodash2["default"].isString(listener.event) && !_lodash2["default"].isRegExp(listener.event)) {
                throw new Error("unknown event name type: " + listener.event);
            }

            var map = _lodash2["default"].isString(listener.event) ? this._eventListenerMap : this._rexEventListenerMap;
            var order = _lodash2["default"].pick(listener, ['before', 'after', 'first', 'last']);
            var listenerArg = [listener.indexName, listener, order];

            if (!map.get(listener.event.toString())) {
                map.set(listener.event.toString(), new _orderedListJs2["default"]());
            }

            var listenerList = map.get(listener.event.toString());

            //调整 waitFor 和 blockFor 的顺序，将所有blockFor都转换成其他人的waitFor
            if (listener.blockFor) {
                var _iteratorNormalCompletion = true;
                var _didIteratorError = false;
                var _iteratorError = undefined;

                try {

                    for (var _iterator = listener.blockFor[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
                        var listenerToBlock = _step.value;

                        if (listenerList.get(listenerToBlock)) {
                            //要block的对象已经存在,那就给他增加个waitFor
                            _utilJs2["default"].ensureSet(listenerList.get(listenerToBlock), "waitFor", listener.indexName);
                        } else {
                            //否则加到一个等待列表里
                            _utilJs2["default"].ensureSet(this._blockForWaiting, listenerToBlock, listener.indexName);
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

            //如果有监听器要block现在的监听器
            if (this._blockForWaiting[listener.indexName]) {
                _utilJs2["default"].ensureSet(listener, "waitFor", this._blockForWaiting[listener.indexName]);
                this._blockForWaiting["delete"](listener.indexName);
            }
            //doneTODO 待验证

            map.set(listener.event.toString(), listenerList.insert.apply(listenerList, listenerArg));

            return this;
        }
    }, {
        key: "getListenersFor",
        value: function getListenersFor(event) {
            var map = _lodash2["default"].isString(event) ? this._eventListenerMap : this._rexEventListenerMap;
            return map.get(event);
        }
    }, {
        key: "muteEvents",
        value: function muteEvents(muteEventNames, type, source, inEventName) {
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
        }
    }, {
        key: "disableListeners",
        value: function disableListeners(listenerNames, fireEventName, listener) {
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
        }
    }, {
        key: "fire",
        value: function fire(eventName) {
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

            for (var _len = arguments.length, data = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
                data[_key - 1] = arguments[_key];
            }

            return this.fireListeners(event, listeners, data);
        }
    }, {
        key: "normalizeEvent",
        value: function normalizeEvent(rawEvent) {

            var fireEvent = _lodash2["default"].isString(rawEvent) ? { name: rawEvent } : rawEvent;
            fireEvent.muteBy = this.getMuteFor(fireEvent.name);
            if (!fireEvent.muteBy) {
                //mute 记录的是后代的事件禁用情况！muteBy记录的时当前的情况
                ["mute", "disable", "target"].forEach(function (key) {
                    if (fireEvent[key]) fireEvent[key] = [].concat(fireEvent[key]);
                });

                if (this._mute.get(fireEvent.name)) {
                    //如果有listener在此事件中需要禁用后代中的事件
                    var _iteratorNormalCompletion2 = true;
                    var _didIteratorError2 = false;
                    var _iteratorError2 = undefined;

                    try {
                        for (var _iterator2 = this._mute.get(fireEvent.name).values()[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
                            var muteEventRecords = _step2.value;

                            this.storeRuntimeMute(muteEventRecords.toArray());
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
                    var _iteratorNormalCompletion3 = true;
                    var _didIteratorError3 = false;
                    var _iteratorError3 = undefined;

                    try {
                        for (var _iterator3 = this._disable.get(fireEvent.name)[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
                            var _step3$value = _slicedToArray(_step3.value, 2);

                            var targetName = _step3$value[0];
                            var sources = _step3$value[1];

                            if (!fireEvent.disable.get(targetName)) {
                                fireEvent.disable.set(targetName, new Set());
                            }
                            var _iteratorNormalCompletion4 = true;
                            var _didIteratorError4 = false;
                            var _iteratorError4 = undefined;

                            try {
                                for (var _iterator4 = sources[Symbol.iterator](), _step4; !(_iteratorNormalCompletion4 = (_step4 = _iterator4.next()).done); _iteratorNormalCompletion4 = true) {
                                    var source = _step4.value;

                                    fireEvent.disable.get(targetName).add(source);
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
        }
    }, {
        key: "getMuteFor",
        value: function getMuteFor(eventName) {
            //永远是从runtime中获取是否被mute了，因为mute永远是对子孙起作用，
            //而子孙是通过runtime传递的
            if (!this._runtime.mute.get(eventName)) return;

            var mute = new MuteRecord();
            if (this._runtime.mute.get(eventName)) {
                //继承祖先事件的mute信息
                mute.concat(this._runtime.mute.get(eventName));
            }

            return mute;
        }
    }, {
        key: "storeRuntimeMute",
        value: function storeRuntimeMute(muteObjects) {
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
        }
    }, {
        key: "findListenersForEvent",
        value: function findListenersForEvent(eventName) {
            // 找到所有匹配的event，字符串和正则
            var listeners = this._eventListenerMap.get(eventName) ? this._eventListenerMap.get(eventName).clone() : new _orderedListJs2["default"]();

            //获取所有匹配到的监听器，并且将正则监听器重新与字符串监听器排序
            var _iteratorNormalCompletion5 = true;
            var _didIteratorError5 = false;
            var _iteratorError5 = undefined;

            try {
                for (var _iterator5 = this._rexEventListenerMap[Symbol.iterator](), _step5; !(_iteratorNormalCompletion5 = (_step5 = _iterator5.next()).done); _iteratorNormalCompletion5 = true) {
                    var _step5$value = _slicedToArray(_step5.value, 2);

                    var rex = _step5$value[0];
                    var rexEventListener = _step5$value[1];

                    if (new RegExp(rex).test(eventName)) {
                        var order = _lodash2["default"].pick(rexEventListener, ['before', 'after', 'first', 'last']);
                        var listenerArg = [rexEventListener.indexName, _lodash2["default"].clone(rexEventListener), order];
                        listeners.insert.apply(listeners, listenerArg);
                    }
                }
            } catch (err) {
                _didIteratorError5 = true;
                _iteratorError5 = err;
            } finally {
                try {
                    if (!_iteratorNormalCompletion5 && _iterator5["return"]) {
                        _iterator5["return"]();
                    }
                } finally {
                    if (_didIteratorError5) {
                        throw _iteratorError5;
                    }
                }
            }

            return listeners;
        }
    }, {
        key: "callListener",
        value: function callListener(listener, snapshot, args) {
            //执行单个监听器,一定返回一个promise
            if (isGenerator(listener.fn)) {
                return (0, _co2["default"])(regeneratorRuntime.mark(function callee$2$0() {
                    var _listener$fn;

                    return regeneratorRuntime.wrap(function callee$2$0$(context$3$0) {
                        while (1) switch (context$3$0.prev = context$3$0.next) {
                            case 0:
                                context$3$0.next = 2;
                                return (_listener$fn = listener.fn).call.apply(_listener$fn, [snapshot].concat(_toConsumableArray(args)));

                            case 2:
                            case "end":
                                return context$3$0.stop();
                        }
                    }, callee$2$0, this);
                }));
            } else {
                var _listener$fn2;

                return Promise.resolve((_listener$fn2 = listener.fn).call.apply(_listener$fn2, [snapshot].concat(_toConsumableArray(args))));
            }
        }
    }, {
        key: "fireListeners",
        value: function fireListeners(event, listeners, data) {
            var _this4 = this;

            //依次触发，通过 snapshot 连接 traceStack, runtime

            //对错误的处理问题参见:https://docs.google.com/document/d/1UW9Lci7KpvPNXLG7n5v_SIEQQOQzIwtHIos44Fl020s/edit?usp=sharing

            //debug.log("fire======",event.name,"listeners:")
            //debug.log( event.disable,[...this._disable.get(event.name).keys()])
            var results = {};

            var listenerCursor = { next: listeners.head };
            var listener;

            var firePromise = (0, _co2["default"])(regeneratorRuntime.mark(function callee$2$0() {
                var _loop, _ret;

                return regeneratorRuntime.wrap(function callee$2$0$(context$3$0) {
                    var _this3 = this;

                    while (1) switch (context$3$0.prev = context$3$0.next) {
                        case 0:
                            if (!event.muteBy) {
                                context$3$0.next = 2;
                                break;
                            }

                            return context$3$0.abrupt("return", false);

                        case 2:
                            _loop = regeneratorRuntime.mark(function callee$3$0() {
                                var snapshot, result, disableNames;
                                return regeneratorRuntime.wrap(function callee$3$0$(context$4$0) {
                                    var _this2 = this;

                                    while (1) switch (context$4$0.prev = context$4$0.next) {
                                        case 0:
                                            listener = listenerCursor.value;
                                            //target 和 disable 可以共存

                                            if (!(event.target && !event.target.has(listener.indexName))) {
                                                context$4$0.next = 3;
                                                break;
                                            }

                                            return context$4$0.abrupt("return", "continue");

                                        case 3:
                                            if (!(event.disable && event.disable.get(listener.indexName))) {
                                                context$4$0.next = 5;
                                                break;
                                            }

                                            return context$4$0.abrupt("return", "continue");

                                        case 5:
                                            snapshot = this.snapshot(event, listener);
                                            result = undefined;

                                            if (!listener.waitFor) {
                                                context$4$0.next = 11;
                                                break;
                                            }

                                            (function () {
                                                //debug.log("calling listener",listener.indexName, listener.waitFor)
                                                //如果waitFor的监听器返回的是promise，那么就等其resolve,
                                                var promiseToWait = [].concat(_toConsumableArray(listener.waitFor)).reduce(function (list, waitForName) {
                                                    if (results[waitForName].data instanceof Promise) {
                                                        list.push(results[waitForName].data);
                                                    } else {
                                                        debug.warn(waitForName + " result is not a promise", results[waitForName]);
                                                    }
                                                    return list;
                                                }, []);

                                                //debug.log(listener.indexName,"must wait for", listener.waitFor, promiseToWait.length)

                                                //并且把自己的结果也包装成Promise，这样可以继续让其他监听器waitFor
                                                var listenerSnapshot = listener;
                                                result = _this2.parseResult(Promise.all(promiseToWait).then(function () {
                                                    return _this2.callListener(listenerSnapshot, snapshot, data);
                                                }));
                                            })();

                                            context$4$0.next = 19;
                                            break;

                                        case 11:
                                            context$4$0.t0 = this;
                                            context$4$0.next = 14;
                                            return this.callListener(listener, snapshot, data);

                                        case 14:
                                            context$4$0.t1 = context$4$0.sent;
                                            result = context$4$0.t0.parseResult.call(context$4$0.t0, context$4$0.t1);

                                            if (!(result.data instanceof _errorJs2["default"])) {
                                                context$4$0.next = 19;
                                                break;
                                            }

                                            context$4$0.next = 19;
                                            return Promise.reject(result.data);

                                        case 19:

                                            //执行没有问题
                                            //暂存一下，后面的waitFor需要用
                                            results[listener.indexName] = result;

                                            //debug.log( `result of ${listener.indexName}`,result,result instanceof ListenerResult )

                                            //动态处理mute
                                            if (result.signal.mute) {
                                                //这里一定要把 mute 放到当前的runtime里面，而不是snapshot。
                                                //动态mute一定要和order一起使用，应为动态的mute只对后续触发的listener中的子孙事件有效。
                                                this.storeRuntimeMute([].concat(result.signal.mute).map(function (muteName) {
                                                    return { target: muteName, source: listener.indexName, type: "call" };
                                                }));
                                            }

                                            //动态处理disable
                                            if (result.signal.disable !== undefined) {
                                                if (!event.disable) event.disable = new Map();
                                                disableNames = [].concat(result.signal.disable);

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
                                                        //debug.log("listener to block updated", listenerToBlock, [...listenerToBlock.waitFor])
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

                                        case 24:
                                        case "end":
                                            return context$4$0.stop();
                                    }
                                }, callee$3$0, _this3);
                            });

                        case 3:
                            if (!(listenerCursor = listenerCursor.next)) {
                                context$3$0.next = 10;
                                break;
                            }

                            return context$3$0.delegateYield(_loop(), "t0", 5);

                        case 5:
                            _ret = context$3$0.t0;

                            if (!(_ret === "continue")) {
                                context$3$0.next = 8;
                                break;
                            }

                            return context$3$0.abrupt("continue", 3);

                        case 8:
                            context$3$0.next = 3;
                            break;

                        case 10:
                        case "end":
                            return context$3$0.stop();
                    }
                }, callee$2$0, this);
            }).

            //TODO 支持async 参数 所有监听器都已经开始执行，等所有异步的的都返回后再一起resolve
            bind(this)).then(function () {
                // 都执行完之后，先将results数据并入到stack里面
                _lodash2["default"].forEach(results, function (result, listenerIndexName) {
                    _this4._runtime.stack[event._stackIndex].listeners[listenerIndexName].result = results[listenerIndexName];
                });

                //TODO 返回一个 bus result 对象，这个对象上的 data 可以用来获取当前事件的数据
                return new BusResult(_this4._runtime.data);
            })["catch"](function (err) {
                //一旦出现问题，循环会自动终止。
                if (!(err instanceof _errorJs2["default"])) {
                    err = new _errorJs2["default"](500, err);
                }
                //debug.error(err)

                // 补充出错的那个监听的result记录
                if (listener && results[listener.indexName] === undefined) {
                    results[listener.indexName] = _this4.parseResult(err, {});
                }

                // 都执行完之后，先将results数据并入到stack里面
                _lodash2["default"].forEach(results, function (result, listenerIndexName) {
                    _this4._runtime.stack[event._stackIndex].listeners[listenerIndexName].result = results[listenerIndexName];
                });

                //改变抛出的err
                return Promise.reject(err);
            });

            //提供默认的this指针
            this.bindThisToResolver(firePromise);

            return firePromise;
        }
    }, {
        key: "bindThisToResolver",
        value: function bindThisToResolver(promise) {
            var _this5 = this;

            var _then = promise.then;
            promise.then = function () {
                for (var _len2 = arguments.length, args = Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
                    args[_key2] = arguments[_key2];
                }

                args = args.map(function (arg) {
                    return typeof arg === 'function' ? arg.bind(_this5) : arg;
                });
                return _then.call.apply(_then, [promise].concat(_toConsumableArray(args)));
            };
            return promise;
        }
    }, {
        key: "parseResult",
        value: function parseResult(result) {
            if (result instanceof ListenerResult) return result;

            return this.result(result, {});
        }
    }, {
        key: "snapshot",
        value: function snapshot(event, listener) {
            var snapshot = { _isSnapshot: true };
            _lodash2["default"].extend(snapshot, this);

            snapshot.__proto__ = this.__proto__;

            var liftedMuteClone = new Map([].concat(_toConsumableArray(this._runtime.mute)).map(function (_ref) {
                var _ref2 = _slicedToArray(_ref, 2);

                var k = _ref2[0];
                var v = _ref2[1];

                v.clone().lift();
                return [k, v];
            }));

            //对当前的listener创建一个新的_runtime，用来记录其中触发的event
            //debug.log( Object.keys(this._runtime.stack[event._stackIndex].listeners), listener.indexName)
            //debug.log(listener.indexName, this._runtime.stack[event._stackIndex].listeners[listener.indexName])
            this._runtime.stack[event._stackIndex].listeners[listener.indexName].stack = [];

            //注意 snapshot 时是不用调用data.child()的，因为同级snapshot共享数据
            snapshot._runtime = {
                reset: _lodash2["default"].noop,
                mute: liftedMuteClone,
                data: this._runtime.data,
                stack: this._runtime.stack[event._stackIndex].listeners[listener.indexName].stack
            };

            return snapshot;
        }
    }, {
        key: "clone",
        value: function clone() {
            var cloned = { _isSnapshot: true };
            //获取当前实例上的一切属性
            _lodash2["default"].extend(cloned, this);

            cloned.__proto__ = this.__proto__;

            //clone一个全新的runtime
            cloned._runtime = this._runtime.clone();

            return cloned;
        }
    }, {
        key: "destroy",
        value: function destroy() {
            for (var i in this) {
                delete this[i];
            }
            this._isDestoryed = true;
            this.__proto__ = null;
        }
    }, {
        key: "fcall",
        value: function fcall(event, listener) {
            //TODO
        }
    }, {
        key: "then",
        value: function then(fn) {
            //TODO 当前对象中没有正在触发的监听器
        }
    }, {
        key: "catch",
        value: function _catch(fn) {}
        //TODO 当前对象中有触发器，并触发了错误

        //这个得到的是每个监听器的Result

    }, {
        key: "result",
        value: function result(data) {
            var signal = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

            if (arguments.length == 1) {
                signal = data;
                data = undefined;
            }
            return new ListenerResult(data, signal);
        }
    }, {
        key: "error",
        value: function error(code, data) {
            return new _errorJs2["default"](code, data);
        }
    }, {
        key: "getRegisteredEvents",
        value: function getRegisteredEvents() {
            //TODO
        }
    }, {
        key: "makeEventStack",
        value: function makeEventStack(event, listenersOrderedList) {
            var eventStack = {};
            eventStack.event = _lodash2["default"].cloneDeep(event);
            eventStack.$class = "event";

            var clonedListenerArray = _lodash2["default"].cloneDeep(listenersOrderedList.toArray(), function (item) {
                if (item instanceof Set) {
                    return [].concat(_toConsumableArray(item));
                } else if (item instanceof Map) {
                    return _lodash2["default"].zipObject([].concat(_toConsumableArray(item.keys())), [].concat(_toConsumableArray(item.values())));
                } else if (item instanceof Function) {
                    return "[Function " + item.name + "]";
                }
            }).map(function (listener) {
                listener.$class = 'listener';
                return listener;
            });

            eventStack.listeners = _lodash2["default"].zipObject(clonedListenerArray.map(function (listener) {
                return listener.indexName;
            }), clonedListenerArray);

            eventStack.index = this._runtime.stack.length;
            return eventStack;
        }
    }, {
        key: "normalizeListener",
        value: function normalizeListener(eventName, listener) {
            listener = _lodash2["default"].isFunction(listener) ? { fn: listener } : listener;
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
                var _iteratorNormalCompletion6 = true;
                var _didIteratorError6 = false;
                var _iteratorError6 = undefined;

                try {
                    for (var _iterator6 = listener.blockFor[Symbol.iterator](), _step6; !(_iteratorNormalCompletion6 = (_step6 = _iterator6.next()).done); _iteratorNormalCompletion6 = true) {
                        var blockForName = _step6.value;

                        listener.before.add(blockForName);
                    }
                } catch (err) {
                    _didIteratorError6 = true;
                    _iteratorError6 = err;
                } finally {
                    try {
                        if (!_iteratorNormalCompletion6 && _iterator6["return"]) {
                            _iterator6["return"]();
                        }
                    } finally {
                        if (_didIteratorError6) {
                            throw _iteratorError6;
                        }
                    }
                }
            }

            if (listener.waitFor) {
                listener.waitFor = new Set([].concat(listener.waitFor));

                if (!listener.after) listener.after = new Set();
                var _iteratorNormalCompletion7 = true;
                var _didIteratorError7 = false;
                var _iteratorError7 = undefined;

                try {
                    for (var _iterator7 = listener.waitFor[Symbol.iterator](), _step7; !(_iteratorNormalCompletion7 = (_step7 = _iterator7.next()).done); _iteratorNormalCompletion7 = true) {
                        var waitForName = _step7.value;

                        listener.after.add(waitForName);
                    }
                } catch (err) {
                    _didIteratorError7 = true;
                    _iteratorError7 = err;
                } finally {
                    try {
                        if (!_iteratorNormalCompletion7 && _iterator7["return"]) {
                            _iterator7["return"]();
                        }
                    } finally {
                        if (_didIteratorError7) {
                            throw _iteratorError7;
                        }
                    }
                }
            }

            if (!listener.name) {
                listener.name = listener.fn.name || this.anonymousName();
            }

            listener.indexName = listener.module.toString() ? listener.module.toString() + "." + listener.name : listener.name;

            return listener;
        }
    }, {
        key: "data",
        get: function get() {
            return this._runtime.data;
        }
    }]);

    return Bus;
})();

exports["default"] = Bus;

var ListenerResult = function ListenerResult(data, signal) {
    _classCallCheck(this, ListenerResult);

    this.$class = data === null || data === undefined ? data : data.constructor.name;
    this.data = data;
    this.signal = signal;
};

var DataProxy = (function () {
    function DataProxy(dataIns) {
        _classCallCheck(this, DataProxy);

        this.data = dataIns.data;
        if (!dataIns.isGlobal) {
            this.global = new DataProxy(dataIns.global);
        }
    }

    _createClass(DataProxy, [{
        key: "get",
        value: function get(key) {
            //TODO 要不要cloneDeep 保障内存一定会被销毁？ cloneDeep 会导致无法传递非 plainObject
            return _utilJs2["default"].getRef(this.data, key);
        }
    }]);

    return DataProxy;
})();

var BusResult = function BusResult(dataIns) {
    _classCallCheck(this, BusResult);

    this.data = new DataProxy(dataIns);
};

var MuteRecord = (function () {
    function MuteRecord() {
        var mutes = arguments.length <= 0 || arguments[0] === undefined ? [] : arguments[0];

        _classCallCheck(this, MuteRecord);

        this._mutes = mutes;
    }

    _createClass(MuteRecord, [{
        key: "add",
        value: function add(mute) {
            this._mutes.push(mute);
        }
    }, {
        key: "concat",
        value: function concat(mutes) {
            if (mutes instanceof MuteRecord) {
                this._mutes = this._mutes.concat(mutes._mutes);
            } else {
                this._mutes = this._mutes.concat(mutes);
            }
        }
    }, {
        key: "clone",
        value: function clone(cloneFn) {
            return new MuteRecord(_lodash2["default"].cloneDeep(this._mutes), cloneFn);
        }
    }, {
        key: "lift",
        value: function lift() {
            this._mutes.forEach(function (mute) {
                mute.lifted = mute.lifted === undefined ? 1 : mute.lifted + 1;
            });
        }
    }, {
        key: "toArray",
        value: function toArray() {
            return _lodash2["default"].cloneDeep(this._mutes);
        }
    }]);

    return MuteRecord;
})();

module.exports = exports["default"];

//OrderedList 已经禁止了重名，所以一个event下的listener是不会重名的
//只记录当前监听器循环中的执行阶段的错误
//异步阶段的错误在 result 中返回，除非开发者没有return相应的promise

//开始遍历监听器

//TODO 同异步情况区分snapshot场景过于复杂，暂时不区分

//保存当前结果

//TODO 增加 async
//如果要等某个异步监听器的返回

//如果监听器没有waitFor
//debug.log("calling none waitFor listener",listener.indexName, listener.waitFor)

//如果执行过程中出错，会得到reject的promise，可以交给外界处理。
//如果是开发者自己返回的error，那么就也伪装成一个reject的promise扔出去