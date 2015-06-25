var merge = require("lodash.merge")
var uniq = require("lodash.uniq")
var cloneDeep = require("lodash.clonedeep")

function isObject( obj ){
  return typeof obj === "object"
}


function isArray( obj ){
  return Object.prototype.toString.call(obj) === "[object Array]"
}


function partialRight( func, arg, context ){
  return function(){
    var runtimeArgs = [...arguments].concat(arg)
    return func(...runtimeArgs)
  }
}


function isString(str){
  return typeof str === "string"
}

function isRegExp(rex){
  return Object.prototype.toString.call(rex) === "[object RegExp]"
}

function pick(obj , keys ){
  var output = {}
  keys.forEach((key)=>{
    output[key] = obj[key]
  })
  return output
}

function isFunction(func){
  return typeof func === "function"
}

function zipObject( keys, values ){
  var output = {}
  keys.forEach((key,i)=>{
    output[key] = values[i]
  })
  return output
}

function noop(){}




function mergeDefaults(a,b){
  return partialRight(merge, function(a, b){
    if(isArray(a) ){
      return uniq(a.concat(b))
    }else if(isObject(a)){
      //return undefined meas go merge children
      return undefined
    }else{
      return b
    }
  })(a,b)
}

function mergeDeep( a, b){
  return partialRight(merge , function( a, b){
    if(isArray(a) && isArray(b)){
      return a.concat(b)
    }else if(isObject(a) && isObject(b)){
      return mergeDeep(a,b)
    }else{
      return undefined
    }
  })(a, b)
}

function getRef( obj, name ){
  var ns = (typeof name === "string") ? name.split(".") :  [].concat(name),
    ref = obj,
    currentName


  while( currentName = ns.shift() ){
    if(isObject(ref) && ref[currentName]){
      ref = ref[currentName]
    }else{
      ref = undefined
      break;
    }
  }

  return ref
}


function setRef( obj, name, data){

  var ns = name.split('.'),
    ref = obj,
    currentName

  while( currentName = ns.shift() ){
    if( ns.length == 0 ){
      if( isObject(ref[currentName] )){
        merge(ref[currentName], data)

      }else{
        if( ref[currentName] !== undefined ) console.debug("you are changing a exist data",name)
        ref[currentName] = data
      }

    }else{
      if( !isObject(ref[currentName])) {
        if( ref[currentName] !== undefined ) console.debug("your data will be reset to an object",currentName)
        ref[currentName] = {}
      }
      ref = ref[currentName]
    }
  }

//  logger.debug("setting done", name, obj)
}

function isPromiseAlike( obj ){
  return isObject(obj) && isFunction(obj.then) && isFunction(obj.catch)
}

function insertListener(arr, item) {
  var place = findIndexToInsert( item, arr )
  return arr.slice(0, place).concat(item, arr.slice(place))
}


function findIndexToInsert( listener, listeners, cacheIndex ){
  if (!this._firstLastCache) this._firstLastCache = {}

  var firstLast = this._firstLastCache[cacheIndex] || findIndex(listeners, function (e) {
      return e.last == true
    })
  if (cacheIndex) {
    if (firstLast == -1 && listener.last) {
      this._firstLastCache[cacheIndex] = listeners.length
    } else if (firstLast != -1 && !listener.last) {
      this._firstLastCache[cacheIndex] = firstLast + 1
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
          (firstLast == -1 ? listeners.length : firstLast)
}

function findIndex(list, iterator) {
  var index = -1
  list.every(function (e, i) {
    if (iterator.apply(this, arguments) === true) {
      index = i
      return false
    }
    return true
  })

  return index
}

function ensureArray(obj,key,value){
  if( obj[key] === undefined ){
    obj[key] = [].concat(value)
  }else{
    obj[key] = [].concat( obj[key], value)
  }
}

function ensureSet(obj,key,value){
  if( value instanceof  Set){
    value = [...value]
  }

  if( obj[key] === undefined ){
    obj[key] = new Set([].concat(value))
  }else{
    obj[key] = new Set([...obj[key]].concat(value))
  }
}

function extend( target, source ){
  for( let i in source){
    target[i] = source[i]
  }
  return target
}

function clone( source ){
  var output = {}
  return extend(output, source)
}

function values( obj ){
  if( typeof Object.values === "function" ){
    return Object.values(obj)
  }else{
    return Object.keys( obj ).map(key=>{return obj[key]})
  }
}

export default {
  isString,
  isArray,
  isFunction,
  isObject,
  isPromiseAlike,
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
  values
}

