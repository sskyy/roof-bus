'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) arr2[i] = arr[i]; return arr2; } else { return Array.from(arr); } }

var _ = require('lodash');

function mergeDefaults(a, b) {
  return _.partialRight(_.merge, function (a, b) {
    if (_.isArray(a)) {
      return _.uniq(a.concat(b));
    } else if (_.isObject(a)) {
      //return undefined meas go merge children
      return undefined;
    } else {
      return b;
    }
  })(a, b);
}

function mergeDeep(a, b) {
  return _.partialRight(_.merge, function (a, b) {
    if (_.isArray(a) && _.isArray(b)) {
      return a.concat(b);
    } else if (_.isObject(a) && _.isObject(b)) {
      return mergeDeep(a, b);
    } else {
      return undefined;
    }
  })(a, b);
}

function getRef(obj, name) {
  var ns = name.split('.'),
      ref = obj,
      currentName;

  while (currentName = ns.shift()) {
    if (_.isObject(ref) && ref[currentName]) {
      ref = ref[currentName];
    } else {
      ref = undefined;
      break;
    }
  }

  return ref;
}

function setRef(obj, name, data) {

  var ns = name.split('.'),
      ref = obj,
      currentName;

  while (currentName = ns.shift()) {
    if (ns.length == 0) {
      if (_.isObject(ref[currentName])) {
        _.merge(ref[currentName], data);
      } else {
        if (ref[currentName] !== undefined) logger.debug('you are changing a exist data', name);
        ref[currentName] = data;
      }
    } else {
      if (!_.isObject(ref[currentName])) {
        if (ref[currentName] !== undefined) logger.debug('your data will be reset to an object', currentName);
        ref[currentName] = {};
      }
      ref = ref[currentName];
    }
  }

  //  logger.debug("setting done", name, obj)
}

function isPromiseAlike(obj) {
  return _.isObject(obj) && _.isFunction(obj.then) && _.isFunction(obj['catch']);
}

function insertListener(arr, item) {
  var place = findIndexToInsert(item, arr);
  return arr.slice(0, place).concat(item, arr.slice(place));
}

function findIndexToInsert(listener, listeners, cacheIndex) {
  if (!this._firstLastCache) this._firstLastCache = {};

  var firstLast = this._firstLastCache[cacheIndex] || findIndex(listeners, function (e) {
    return e.last == true;
  });
  if (cacheIndex) {
    if (firstLast == -1 && listener.last) {
      this._firstLastCache[cacheIndex] = listeners.length;
    } else if (firstLast != -1 && !listener.last) {
      this._firstLastCache[cacheIndex] = firstLast + 1;
    }
  }

  return listener.first ? 0 : listener.before ? findIndex(listeners, function (e) {
    return e.name == listener.before;
  }) : listener.after ? findIndex(listeners, function (e) {
    return e.name == listener.before;
  }) + 1 : listener.last ? listeners.length : firstLast == -1 ? listeners.length : firstLast;
}

function findIndex(list, iterator) {
  var index = -1;
  list.every(function (e, i) {
    if (iterator.apply(this, arguments) === true) {
      index = i;
      return false;
    }
    return true;
  });

  return index;
}

function ensureArray(obj, key, value) {
  if (obj[key] === undefined) {
    obj[key] = [].concat(value);
  } else {
    obj[key] = [].concat(obj[key], value);
  }
}

function ensureSet(obj, key, value) {
  if (value instanceof Set) {
    value = [].concat(_toConsumableArray(value));
  }

  if (obj[key] === undefined) {
    obj[key] = new Set([].concat(value));
  } else {
    obj[key] = new Set([].concat(_toConsumableArray(obj[key])).concat(value));
  }
}

exports['default'] = { isPromiseAlike: isPromiseAlike, mergeDefaults: mergeDefaults, mergeDeep: mergeDeep, getRef: getRef, setRef: setRef, insertListener: insertListener, findIndex: findIndex, ensureArray: ensureArray, ensureSet: ensureSet };
module.exports = exports['default'];