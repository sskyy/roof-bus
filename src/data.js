import util from "./util.js"

function isObject(obj){
  return typeof obj === "object"
}

function getRef( obj, name ){
  var ns = name.split('.'),
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


function setRef( obj, name, data, overwrite=false){

  var ns = name.split('.'),
    ref = obj,
    currentName

  while( currentName = ns.shift() ){
    if( ns.length == 0 ){
      if( isObject(ref[currentName] )){
        util.merge(ref[currentName], data)

      }else{
        if( ref[currentName] !== undefined && !overwrite ){
          throw new Error("you should set argument overwrite to true, if you want to change a exist data.")
        }
        ref[currentName] = data
      }

    }else{
      if( !isObject(ref[currentName])) {
        if( ref[currentName] !== undefined && !overwrite ){
          throw new Error("you should set argument overwrite to true, if you want to change a exist data.")
        }
        ref[currentName] = {}
      }
      ref = ref[currentName]
    }
  }
}



class Data{
  constructor( global ){
    if( global ){
      this.global = global
    }else{
      //global 不能自己生成，而是由第一个 child data生成
      let global = new Data({})
      //强行修改指针
      global.global = global
      global.isGlobal = true

      this.global = global

    }

    this.data = {}

  }
  set(key,data){
    setRef(this.data, key, data)
  }
  overwrite(key,data){
    setRef(this.data, key, data, true)
  }
  get(key){
    return getRef( this.data, key)
  }
  child(){
    //没有引用子对象，不会引起循环引用
    return new Data( this.global || this )
  }
  //runtime在reset时会调用 destroy。防止内存泄露。
  destroy(){
    this.global = null
    this.data = null
  }
}

export default Data