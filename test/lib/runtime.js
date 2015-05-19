import assert from "assert"
import {Runtime,Facade} from "../../src/runtime.js"

class TestFacade{
  constructor( args ){
    this.args = args
  }
}


describe("promise test", ()=>{
  var testFacadeArgs = {
    str : "str1",
    obj : {arr:[1,2,3]}
  }
  var args = {
    str : "str",
    arr : [1,2,3],
    obj : new Facade( TestFacade, testFacadeArgs )
  }

  var rt

  beforeEach(()=>{
    rt = new Runtime(args)
  })


  it("runtime constructor",()=>{
    for( let {key,value} in args ){
      if( value instanceof Facade){
        assert.equal( rt[key], new TestFacade(testFacadeArgs) )
      }else{
        assert.equal(rt[key], value)
      }
    }
  })

  it("runtime reset",()=>{
    rt.str = "aaa"
    rt.arr.push(4)
    rt.obj.extra = true

    rt.reset()
    for( let {key,value} in args ){
      if( value instanceof Facade){
        assert.equal( rt[key], new TestFacade(testFacadeArgs) )
        for( let {facadeArgKey, facadeArgValue} in testFacadeArgs ){
          assert( rt[key].args[facadeArgKey].toString(), facadeArgValue.toString() )
        }
      }else{
        assert.equal(rt[key], value)
      }
    }
  })
})