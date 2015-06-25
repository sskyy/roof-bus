import util from "./util.js"

function walkObject( data, handler, path=[] ){
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
  constructor( definition = {}){
    this._definition = definition
    this.setup()
  }
  initializeData(){
    return util.cloneDeep(this._definition,(child)=>{
      if( child instanceof  Facade){
        return new child.ctor(...child.args)
      }
    })
  }
  setup(){
    util.extend( this, this.initializeData() )
  }
  reset(){

    //必须destroy,防止有内存泄露
    walkObject(this._definition,( data, key, path)=>{
      if( data instanceof Facade){
        let obj = util.getRef( this, path)
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

}

class Facade{
  constructor( ctor, ...args){
    this.ctor = ctor
    this.args = args
  }
}

export {Runtime,Facade}