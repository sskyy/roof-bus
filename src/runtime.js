import _ from "lodash"

function walkObject( data, handler, path=[] ){
  if( _.isFunction(data) ||  !_.isObject(data)) return

  _.forEach(data,function(subData,key){
    //console.log( subData, key)
    var keepWalking = handler(subData,key, path.concat(key) ) !== false
    //console.log( subData, key, keepWalking, path.concat(key))
    keepWalking &&  walkObject(subData, handler, path.concat(key))
  })
}


class Runtime{
  constructor( definition = {}){
    this._definition = definition
    this.setup()
  }
  initializeData(){
    return _.cloneDeep(this._definition,(child)=>{
      if( child instanceof  Facade){
        return new child.ctor(...child.args)
      }
    })
  }
  setup(){
    _.extend( this, this.initializeData() )
  }
  reset(){

    //必须destroy,防止有内存
    walkObject(this._definition,( data, key, path)=>{
      if( data instanceof Facade){
        if( _.isFunction(_.get( this, path).destroy  )){
          _.get( this, path).destroy()
        }
        //stop walking
        return false
      }
    })
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