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
      //循环引用，防止用户不知道自己在顶层。
      //全局应该只有一个这样的数据对象
      this.global = this
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
    return new Data( this.global || this )
  }
  //一定要有destroy，runtime在reset时会调用
  //清除循环引用，防止内存泄露
  destroy(){
    this.global = null
    this.data = null
  }
}

export default Data