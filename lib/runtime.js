'use strict'
var util =require('./util.js')

function walkObject( data, handler, path ){
  path = path || []
  if( util.isFunction(data) ||  !util.isObject(data)) return

  for( let key in data){
    let subData = data[key]
    //console.log( subData, key)
    var keepWalking = handler(subData,key, path.concat(key) ) !== false
    //console.log( subData, key, keepWalking, path.concat(key))
    keepWalking &&  walkObject(subData, handler, path.concat(key))
  }
}



class Runtime{
  constructor( definition ){
    definition = definition || {}
    this._definition = definition
    this.setup()
  }
  initializeData(){
    return util.cloneDeep(this._definition,function(child){
      if( child instanceof  Facade){
        //TODO 由于没有 spread，目前只能接受一个参数
        return new  child.ctor(child.args[0])
      }
    })
  }
  setup(){
    util.extend( this, this.initializeData() )
  }
  reset(){

    //必须destroy,防止有内存泄露
    var that = this
    walkObject(this._definition,function( data, key, path){
      if( data instanceof Facade){
        let obj = util.getRef( that, path)
        if( obj && util.isFunction( obj.destroy  )){
          obj.destroy()
        }
        //stop walking
        return false
      }
    })

    //删除, 触发垃圾回收
    for( var keyName in this._definition ){
      delete this[keyName]
    }

    this.setup()
  }
  clone(){
    return new Runtime(this._definition)
  }
}

class Facade{
  constructor( ctor){
    var args = Array.prototype.slice.call( arguments, 1)
    if( args.length > 1 ) throw new Error('Facade can only accept constructor with 1 parameter')
    this.ctor = ctor
    this.args = args
  }
}

module.exports = {Runtime,Facade}