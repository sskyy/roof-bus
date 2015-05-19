import _ from "lodash"


class Runtime{
  constructor( definition = {}){
    this._definition = definition
    this.reset()
  }
  initializeData(){
    return _.cloneDeep(this._definition,(child)=>{
      if( child instanceof  Facade){
        return new child.ctor(...child.args)
      }
    })
  }
  reset(){
    _.extend( this, this.initializeData() )
  }

}

class Facade{
  constructor( ctor, ...args){
    this.ctor = ctor
    this.args = args
  }
}

export {Runtime,Facade}