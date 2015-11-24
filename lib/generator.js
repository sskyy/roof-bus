'use strict'

const util = require('./util.js')
const Namespace = require('./Namespace.js')
const OrderedList = require('./OrderedList.js')
const BusRuntime = require('./Runtime.js')
const BusError = require('./Error.js')
const Debug = require('./Debug.js')
const debugHandler = require('./debug-handler.js')
const co = require('co')

const debug = new Debug(null, debugHandler)

class Bus {
  constructor(options) {
    this.options = util.extend({}, options || {})

    this._listenerToDisable = new Map
    this._eventListenerMap = new Map
    this._rexEventListenerMap = new Map

    //registration info
    this._module = new Namespace
    this._blockForWaiting = new Set
    this._anonymousIndex = 0

    //store change listener
    this._onChangeListeners = []
  }

  //register listener
  on(eventName, originListener) {
    const listener = this.normalizeListener(eventName, originListener)
    this.insertListener(listener)
    //mute option can only mute descendant event
    listener.disable && this.storeDisableRecord(listener.disable, eventName, listener)
  }

  //dump listener
  off() {

  }

  //keep listener in this._eventListenerMap
  insertListener(listener) {
    if (! util.isString(listener.event) && ! util.isRegExp(listener.event)) {
      throw new Error(`Only String or RegExp can be used as event name`)
    }

    const map = util.isString(listener.event) ? this._eventListenerMap : this._rexEventListenerMap
    const order = util.pick(listener, [ 'before', 'after', 'first', 'last' ])

    //no listener registered on the same event
    if (! map.get(listener.event.toString())) {
      map.set(listener.event.toString(), new OrderedList)
    }

    const listenerList = map.get(listener.event.toString())

    //convert blockFor to target's waitFor, it is easier to control the order
    if (listener.blockFor) {

      for (let listenerToBlock of listener.blockFor) {
        if (listenerList.get(listenerToBlock)) {
          util.ensureSet(listenerList.get(listenerToBlock), 'waitFor', listener.indexName)
        } else {
          //if blockFor target is not in the listener list yet, we need to wait for its insert.
          util.ensureSet(this._blockForWaiting, listenerToBlock, listener.indexName)
        }
      }
    }

    //if other listener want to blockFor current listener
    if (this._blockForWaiting[ listener.indexName ]) {
      util.ensureSet(listener, 'waitFor', this._blockForWaiting[ listener.indexName ])
      this._blockForWaiting.delete(listener.indexName)
    }

    //save the listener to map
    map.set(listener.event.toString(), listenerList.insert(listener.indexName, listener, order))

    return this
  }

  fire(rawEvent) {
    //TODO notice user if current bus is still firing
    //every time root bus fire a event, generate a new runtime
    //instead or reset
    if (! this.isSnapshot()) {
      this._runtime = new BusRuntime()
    }

    //all mute and disable are stored when normalizeEvent
    const event = this.normalizeEvent(rawEvent)


    const eventArgv = util.slice(arguments, 1)
    const listeners = this.getListeners(event.name)

    this._eventRuntimeKey = this._runtime.generateEventRuntime(this._listenerRuntimeKey, event, listeners)

    //根据触发条件{mute,disable,target}，依次触发监听器,如果监听器有 waitFor 选项，则将其加入到 waitFor 对象的 promise 中

    //获取监听器返回值
    // 如果返回非 bus.signal, 则继续执行。
    // 如果返回 bus.signal包装过的结果，如果结果是 promise，并且blockFor为all，则暂停遍历。
    // 如果没有结果或者是普通结果， signal{mute,disable,blockFor}, 则动态改变后面的触发条件

    // 如果返回 error, 则立即跳出整个 触发栈
    // 如果返回的是普通的对象，则构建结果树(不是数据树！)

    // 冲突情况: 异步的 waitFor 中返回的结果无法 block 任何
    this._runtime.recordFiring(event.name)
    this.notifyOnChangeListeners(undefined, event.name)

    const eventPromise = this.fireListeners(event, listeners, eventArgv)

    eventPromise.then(()=> {
      this._runtime.removeFiringRecord(event.name)
      this.notifyOnChangeListeners(undefined, event.name)
    //}).catch((err)=> {
    //  this._runtime.removeFiringRecord(event.name)
    //  this.notifyOnChangeListeners(err, event.name)
    })

    return eventPromise
  }

  notifyOnChangeListeners(err, eventName) {
    this._onChangeListeners.forEach(fn=> {
      fn(err, eventName)
    })
  }

  isFiring(eventName) {
    return this._runtime.isFiring(eventName)
  }

  onChange(onChangeListener) {
    this._onChangeListeners.push(onChangeListener)
  }

  fireListeners(event, listeners, eventArgv) {
    //依次触发，通过 snapshot 连接 traceStack, runtime

    //debug.log('fire======',event.name,'listeners:')
    //debug.log( event.disable,[...this._listenerToDisable.get(event.name).keys()])
    //used to save listener result
    const results = {}

    //point to current listener position in listeners list
    let listenerCursor = { next: listeners.head }
    //point to the real listener instance

    const asyncErrors = []

    const firePromise = co(function *() {

      //begin to call listeners, note that data are shared between listeners
      while (listenerCursor.next !== undefined) {
        listenerCursor = listenerCursor.next
        let listener = listenerCursor.value

        //event can be fired targeting certain listener
        if (event.target && ! event.target.has(listener.indexName)) continue
        //event can disable certain listener
        if (event.disable && event.disable.get(listener.indexName)) continue

        //create snapshot of bus for current listener
        let snapshot = this.snapshot(listener)
        //used to save current listener result
        let result


        //if we have to wait for other listeners
        if (listener.waitFor) {
          debug.log('calling listener', listener.indexName, listener.waitFor)
          //if the target or targets  we are waiting is a promise
          let promiseToWait = util.from(listener.waitFor).reduce(function (waitForPromiseList, waitForName) {
            if (results[ waitForName ].data instanceof Promise) {
              //the real promise
              waitForPromiseList.push(results[ waitForName ].data)
            } else {
              debug.warn(`listener '${waitForName}' is not async listener, please use 'after' instead of 'waitFor'`)
            }
            return waitForPromiseList
          }, [])

          //debug.log(listener.indexName,'must wait for', listener.waitFor, promiseToWait.length)

          //wrap current result to a promise, so current listener can be `waitFor` too

          result = this.parseResult(Promise.all(promiseToWait).then(()=> {
            return this.callListener(listener, snapshot, eventArgv)
          }))

        } else {
          //if no waitFor option
          //debug.log('calling none waitFor listener', listener.indexName)
          if (listener.async) {
            //listener with async option can not be generator
            if (util.isGenerator(listener.fn)) throw new Error('generator can not be used as async listener.')
            result = this.parseResult(this.callListener(listener, snapshot, eventArgv))
          } else {
            result = this.parseResult(yield this.callListener(listener, snapshot, eventArgv))
          }

          //if we got a BusError, we should break the loop as build-in error
          if (result.data instanceof BusError) {
            return Promise.reject(result.data)
          }
        }

        //if nothing is wrong, we should get a BusResult instance
        //save current listener result, may be use by other listener
        //console.log('saving result of', listener.indexName, result)
        results[ listener.indexName ] = result

        //debug.log( `result of ${listener.indexName}`,result,result instanceof ListenerResult )

        //we can disable other listeners on the  fly
        if (result.signal.disable !== undefined) {
          if (! event.disable) event.disable = new Map
          let disableNames = [].concat(result.signal.disable)
          disableNames.forEach(function (disableName) {
            if (! event.disable.get(disableName)) event.disable.set(disableName, new Set)
            event.disable.get(disableName).add({ target: disableName, source: listener.indexName, type: 'call' })
          })
        }

        //destroy snapshot if listener executed
        if (result.data && result.data instanceof Promise) {
          result.data.then(function () {
            snapshot.destroy()
          }).catch(function (e) {
            snapshot.destroy()
            throw e
          })
        } else {
          snapshot.destroy()
        }
      }

      //wait for all listeners who returned a promise, no matter it is async or not
      return Promise.all(util.map(results, function (result) {
        if (result.data instanceof Promise) {
          //we wrap async error
          return result.data.catch(function (err) {
            if (! (err instanceof BusError)) {
              err = new BusError(500, err)
            }
            asyncErrors.push(err)
            //NOTICE! async error will not let the promise reject here, we will reject later
            return Promise.resolve()
          })
        }
      }))

    }.bind(this)).then(()=> {

      //返回一个 bus result 对象，这个对象上的 data 可以用来获取当前事件的数据
      if (asyncErrors.length !== 0) {
        return Promise.reject(new BusError(- 500, null, undefined, asyncErrors))
      } else {
        return new BusResult(this._runtime.getRuntime(this._eventRuntimeKey).data, asyncErrors)
      }

    }).catch((err)=> {
      //any synchronous error will be caught here.
      if (! (err instanceof BusError)) {
        err = new BusError(500, err, undefined, asyncErrors)
      }

      //return a wrapped data
      return Promise.reject(err)
    })

    //提供默认的this指针
    this.bindThisToResolver(firePromise)

    return firePromise
  }

  anonymousName() {
    return `anonymous_${this._anonymousIndex ++}`
  }

  getListenersFor(event) {
    var map = util.isString(event) ? this._eventListenerMap : this._rexEventListenerMap
    return map.get(event)
  }

  storeDisableRecord(listenerNames, fireEventName, listener) {
    listenerNames = [].concat(listenerNames)
    if (! this._listenerToDisable.get(fireEventName)) {
      this._listenerToDisable.set(fireEventName, new Map)
    }

    var disableMap = this._listenerToDisable.get(fireEventName)
    listenerNames.forEach(function (listenerName) {
      if (! disableMap.get(listenerName)) {
        disableMap.set(listenerName, new Set)
      }
      disableMap.get(listenerName).add({ target: listenerName, source: listener.indexName, type: 'listener' })
    })
  }

  normalizeEvent(rawEvent) {

    const eventObject = util.isString(rawEvent) ? { name: rawEvent } : rawEvent
    const propertyToInitialize = [ 'disable', 'target' ]

    propertyToInitialize.forEach(function (key) {
      if (eventObject[ key ]) eventObject[ key ] = [].concat(eventObject[ key ])
    })


    //disable listener when fire
    if (eventObject.disable) {
      eventObject.disable = new Map([].concat(eventObject.disable).map(function (targetName) {
        return [ targetName, new Set([ { target: targetName, source: eventObject.name, type: 'fire' } ]) ]
      }))
    }

    //disable listener when listener register
    if (this._listenerToDisable.get(eventObject.name)) {
      if (! eventObject.disable) eventObject.disable = new Map
      for (let item of this._listenerToDisable.get(eventObject.name)) {
        let targetName = item[ 0 ]
        let sources = item[ 1 ]
        if (! eventObject.disable.get(targetName)) {
          eventObject.disable.set(targetName, new Set)
        }
        for (let source of sources) {
          eventObject.disable.get(targetName).add(source)
        }
      }
    }

    if (eventObject.target) {
      eventObject.target = new Set([].concat(eventObject.target))
    }

    return eventObject
  }

  getListeners(eventName) {
    // 找到所有匹配的event，字符串和正则
    var listeners = this._eventListenerMap.get(eventName) ? this._eventListenerMap.get(eventName).clone() : new OrderedList


    //获取所有匹配到的监听器，并且将正则监听器重新与字符串监听器排序
    for (let item of this._rexEventListenerMap) {
      let rex = item[ 0 ]
      let rexEventListener = item[ 1 ]
      if ((new RegExp(rex)).test(eventName)) {
        let order = util.pick(rexEventListener, [ 'before', 'after', 'first', 'last' ])
        listeners.insert(rexEventListener.indexName, util.clone(rexEventListener), order)
      }
    }

    return listeners
  }

  callListener(listener, snapshot, args) {
    //执行单个监听器,一定返回一个promise
    if (util.isGenerator(listener.fn)) {
      return co(function *() {
        return yield listener.fn.apply(snapshot, args)
      })
    } else {
      return Promise.resolve(listener.fn.apply(snapshot, args))
    }
  }

  bindThisToResolver(promise) {
    var _then = promise.then
    var that = this
    promise.then = function () {
      var args = Array.prototype.slice.call(arguments, 0)
      args = args.map(arg=>arg && arg.bind(that))
      return _then.apply(promise, args)
    }
    return promise
  }

  parseResult(result) {
    if (result instanceof ListenerResult) return result

    return this.result(result, {})
  }

  isSnapshot() {
    return this._isSnapshot === true
  }

  snapshot(listener) {
    //同级的snapshot, data 是共享的。其他都不共享
    //所以 data 由参数传进来
    const snapshot = util.extend({
      _isSnapshot: true,
      _eventRuntimeKey: this._eventRuntimeKey.slice(0),
      _listenerRuntimeKey: this._runtime.getListenerRuntimeKey(this._eventRuntimeKey, listener.indexName)
    }, this)

    snapshot.__proto__ = this.__proto__

    return snapshot
  }

  clone() {
    var cloned = { _isSnapshot: true }
    //获取当前实例上的一切属性
    util.extend(cloned, this)

    cloned.__proto__ = this.__proto__

    return cloned
  }

  destroy() {
    for (var i in this) {
      delete this[ i ]
    }
    this._isDestoryed = true
    this.__proto__ = null
  }

  set(key, value) {
    const runtime = this._runtime.getRuntime(this._eventRuntimeKey)
    runtime.data.shared[ key ] = value
  }

  get(key) {
    return this._runtime.getRuntime(this._eventRuntimeKey).data.shared[ key ]
  }

  getGlobal(key) {
    return this._runtime.getRuntime().data.global[ key ]
  }

  setGlobal(key, value) {
    const runtime = this._runtime.getRuntime()
    runtime.data.global[ key ] = value
  }

  //这个得到的是每个监听器的Result
  result(data, signal) {
    signal = signal || {}
    if (arguments.length == 1) {
      signal = data
      data = undefined
    }
    return new ListenerResult(data, signal)
  }

  error(code, data) {
    return new BusError(code, data)
  }

  getEvents() {
    var events = []
    for (let name of this._eventListenerMap.keys()) {
      events.push(name)
    }
    return events
  }

  makeEventStack(event, listenersOrderedList, index) {
    const eventStack = {}
    eventStack.event = util.cloneDeep(event)
    eventStack.$class = 'event'

    const clonedListenerArray = util.cloneDeep(listenersOrderedList.toArray(), function (item) {
      if (item instanceof Set) {
        return util.from(item)
      } else if (item instanceof Map) {
        return util.zipObject(util.from(item.keys()), util.from(item.values()))
      } else if (item instanceof Function) {
        return `[Function ${item.name}]`
      }
    }).map(function (listener) {
      listener.$class = 'listener'
      return listener
    })

    eventStack.listeners = util.zipObject(clonedListenerArray.map(function (listener) {
      return listener.indexName
    }), clonedListenerArray)

    eventStack.index = index
    return eventStack
  }

  normalizeListener(eventName, listener) {
    listener = util.isFunction(listener) ? { fn: listener } : listener
    listener.event = eventName

    //change plain string to Namespace object
    if (! listener.module) {
      listener.module = this._module.clone()
    } else {
      if (listener.module !== this._module.toString()) {
        listener.vendor = this._module.clone()
      } else {
        listener.module = new Namespace(listener.module)
      }
    }

    if (listener.before) {
      listener.before = new Set([].concat(listener.before))
    }

    if (listener.after) {
      listener.after = new Set([].concat(listener.after))
    }

    if (listener.blockFor) {
      listener.blockFor = new Set([].concat(listener.blockFor))

      if (! listener.before) listener.before = new Set
      for (let blockForName of listener.blockFor) {
        listener.before.add(blockForName)
      }
    }

    if (listener.waitFor) {
      listener.waitFor = new Set([].concat(listener.waitFor))

      if (! listener.after) listener.after = new Set
      for (let waitForName of listener.waitFor) {
        listener.after.add(waitForName)
      }
    }

    if (! listener.name) {
      listener.name = listener.fn.name || this.anonymousName()
    }

    listener.indexName = listener.module.toString() ? `${listener.module.toString()}.${listener.name}` : listener.name

    return listener
  }
}

class ListenerResult {
  constructor(data, signal) {
    this.$class = (data === null || data === undefined) ? data : data.constructor.name
    this.data = data
    this.signal = signal
  }
}

class BusResult {
  constructor(data, errors) {
    this.data = data
    this.errors = errors
  }

  get(key) {
    return this.data.shared[ key ]
  }

  getGlobal(key) {
    return this.data.global[ key ]
  }
}

module.exports = Bus
