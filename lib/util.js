/* eslint-disable no-console */
'use strict'

var merge = require('lodash.merge')
var uniq = require('lodash.uniq')
var cloneDeep = require('lodash.clonedeep')

function isObject(obj) {
  return typeof obj === 'object'
}


function isArray(obj) {
  return Object.prototype.toString.call(obj) === '[object Array]'
}


function partialRight(func, arg, context) {
  return function () {
    var runtimeArgs = Array.prototype.slice.call(arguments, 0).concat(arg)
    return func.apply(context || null, runtimeArgs)
  }
}

function isString(str) {
  return typeof str === 'string'
}

function isRegExp(rex) {
  return Object.prototype.toString.call(rex) === '[object RegExp]'
}

function pick(obj, keys) {
  var output = {}
  keys.forEach(function (key) {
    output[ key ] = obj[ key ]
  })
  return output
}

function isFunction(func) {
  return typeof func === 'function'
}

function zipObject(keys, values) {
  var output = {}
  keys.forEach(function (key, i) {
    output[ key ] = values[ i ]
  })
  return output
}

function noop() {
}


function mergeDefaults(a, b) {
  return partialRight(merge, function (a, b) {
    if (isArray(a)) {
      return uniq(a.concat(b))
    } else if (isObject(a)) {
      //return undefined meas go merge children
      return undefined
    } else {
      return b
    }
  })(a, b)
}

function mergeDeep(a, b) {
  return partialRight(merge, function (a, b) {
    if (isArray(a) && isArray(b)) {
      return a.concat(b)
    } else if (isObject(a) && isObject(b)) {
      return mergeDeep(a, b)
    } else {
      return undefined
    }
  })(a, b)
}

function getRef(obj, name) {
  var ns = (typeof name === 'string') ? name.split('.') : [].concat(name),
    ref = obj,
    currentName


  while ((currentName = ns.shift()) !== undefined) {
    if (isObject(ref) && ref[ currentName ]) {
      ref = ref[ currentName ]
    } else {
      ref = undefined
      break
    }
  }

  return ref
}


function setRef(obj, name, data) {

  var ns = name.split('.'),
    ref = obj,
    currentName

  currentName = ns.shift()
  while (currentName !== undefined) {
    if (ns.length == 0) {
      if (isObject(ref[ currentName ])) {
        merge(ref[ currentName ], data)

      } else {
        if (ref[ currentName ] !== undefined) console.debug('you are changing a exist data', name)
        ref[ currentName ] = data
      }

    } else {
      if (! isObject(ref[ currentName ])) {
        if (ref[ currentName ] !== undefined) console.debug('your data will be reset to an object', currentName)
        ref[ currentName ] = {}
      }
      ref = ref[ currentName ]
    }

    currentName = ns.shift()
  }

//  logger.debug('setting done', name, obj)
}

function isPromiseAlike(obj) {
  return isObject(obj) && isFunction(obj.then) && isFunction(obj.catch)
}

function insertListener(arr, item) {
  var place = findIndexToInsert(item, arr)
  return arr.slice(0, place).concat(item, arr.slice(place))
}


function findIndexToInsert(listener, listeners, cacheIndex) {
  if (! this._firstLastCache) this._firstLastCache = {}

  var firstLast = this._firstLastCache[ cacheIndex ] !== undefined ?
    this._firstLastCache[ cacheIndex ] :
    findIndex(listeners, function (e) {
      return e.last == true
    })

  if (cacheIndex) {
    if (firstLast == - 1 && listener.last) {
      this._firstLastCache[ cacheIndex ] = listeners.length
    } else if (firstLast != - 1 && ! listener.last) {
      this._firstLastCache[ cacheIndex ] = firstLast + 1
    }
  }

  return listener.first ? 0 :
    listener.before ? findIndex(listeners, function (e) {
      return e.name == listener.before
    }) :
      listener.after ? findIndex(listeners, function (e) {
        return e.name == listener.before
      }) + 1 :
        listener.last ? listeners.length :
          (firstLast == - 1 ? listeners.length : firstLast)
}

function findIndex(list, iterator) {
  var index = - 1
  list.every(function (e, i) {
    if (iterator.apply(this, arguments) === true) {
      index = i
      return false
    }
    return true
  })

  return index
}

function ensureArray(obj, key, value) {
  if (obj[ key ] === undefined) {
    obj[ key ] = [].concat(value)
  } else {
    obj[ key ] = [].concat(obj[ key ], value)
  }
}

function ensureSet(obj, key, value) {
  if (value instanceof Set) {
    value = from(value)
  }

  if (obj[ key ] === undefined) {
    obj[ key ] = new Set([].concat(value))
  } else {
    obj[ key ] = new Set(from(obj[ key ]).concat(value))
  }
}

function extend(target, source) {
  for (let i in source) {
    target[ i ] = source[ i ]
  }
  return target
}

function clone(source) {
  var output = {}
  return extend(output, source)
}

function values(obj) {
  if (typeof Object.values === 'function') {
    return Object.values(obj)
  } else {
    return Object.keys(obj).map(function (key) {
      return obj[ key ]
    })
  }
}

function fnName(fn) {
  //Thanks for IE8's broken function.name
  if (fn.name) return fn.name
  var match = fn.toString().match(/^function\s*([^\s(]+)/)
  if (match) return match[ 1 ]
}

function from(setOrMap) {
  var result = []

  for (let item of setOrMap) {
    result.push(item)
  }

  return result
}

function defaults(target, defaultValues) {
  var result = cloneDeep(target)
  for (let i in defaultValues) {
    if (result[ i ] === undefined) {
      result[ i ] = defaultValues[ i ]
    }
  }
  return result
}

function map(obj, handler) {
  var results = []

  Object.keys(obj).forEach(function (key) {
    var result = handler(obj[ key ], key)
    if (result !== undefined) results.push(result)
  })
  return results
}


function forEach(obj, handler) {
  Object.keys(obj).forEach(function (key) {
    handler(obj[ key ], key)
  })
}

function isGenerator(fn) {
  return fn.constructor.name === 'GeneratorFunction'
}

function slice(arr, start, length) {
  return Array.prototype.slice.call(arr, start, length)
}

function indexBy(arr, key) {
  const result = {}
  arr.forEach(item => {
    result[ item[ key ] ] = item
  })

  return result
}

module.exports = {
  isString,
  isArray,
  isFunction,
  isObject,
  isPromiseAlike,
  isRegExp,
  mergeDefaults,
  mergeDeep,
  getRef,
  setRef,
  insertListener,
  findIndex,
  ensureArray,
  ensureSet,
  cloneDeep,
  merge,
  uniq,
  noop,
  zipObject,
  pick,
  extend,
  clone,
  values,
  fnName,
  from,
  defaults,
  map,
  forEach,
  isGenerator,
  slice,
  indexBy
}

