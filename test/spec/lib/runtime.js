'use strict'

var assert =require("assert")
var runtime = require("../../../lib/runtime.js")
var Runtime = runtime.Runtime
var Facade = runtime.Facade

class TestFacade{
  constructor( args ){
    this.args = args
  }
}


describe("promise test", function(){
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

  beforeEach(function(){
    rt = new Runtime(args)
  })


  it("runtime constructor",function(){
    for( let key in args ){
      let value = args[key]
      //if( value instanceof Facade){
      //  assert.equal( rt[key].toString(), (new TestFacade(testFacadeArgs).toString()) )
      //}else{
        assert.equal(rt[key].toString(), value.toString())
      //}
    }
  })

  it("runtime reset",function(){
    rt.str = "aaa"
    rt.arr.push(4)
    rt.obj.extra = true

    rt.reset()
    for( let key in args ){
      let value = args[key]
      if( value instanceof Facade){
        assert.equal( rt[key].toString(), (new TestFacade(testFacadeArgs)).toString() )
        for( let facadeArgKey in testFacadeArgs ){
          let  facadeArgValue = testFacadeArgs[facadeArgKey]
          assert( rt[key].args[facadeArgKey].toString(), facadeArgValue.toString() )
        }
      }else{
        assert.equal(rt[key].toString(), value.toString())
      }
    }
  })
})