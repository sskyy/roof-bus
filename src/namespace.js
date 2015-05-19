//TODO 解决JSON.stringify 打印出对象的问题

class Namespace extends String{
  constructor( defaultModule ){
    super()
    this.namespace = defaultModule ?
      typeof defaultModule == "string" ?
        defaultModule.split(":") : defaultModule
      : []
  }
  push(name){
    this.namespace.push(name)
    return this
  }
  pop(){
    return this.namespace.pop()
  }
  set(name){
    if( this.namespace.length ==0 ){
      this.namespace.push(name)
    }else{
      this.namespace[this.namespace.length-1] =name
    }
    return this
  }
  get(){
    return this.namespace[this.namespace.length-1]
  }
  parent(){
    return this.namespace[this.namespace.length-2]
  }
  clone(){
    return new Namespace( this.namespace )
  }
  valueOf(){
    return this.namespace.join(":")
  }
  toObject(){
    return this.namespace.join(":")
  }
  toString(){
    return this.namespace.join(":")
  }
}

export default Namespace
