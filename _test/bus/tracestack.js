var assert = require("assert")
var prettyjson = require("prettyjson")
var print = function( obj ){
  console.log( prettyjson.render(obj))
}

//TODO tracestack 测试！！！！

module.exports = function( Bus ){
  describe("error test",function(){
    //return
    var bus
    var event = "dance"
    var childEvent = "sing"
    var descendantEvent = "shoot"

    beforeEach(function(){
      bus = new Bus
    })

    it("expect to break the listener loop", function(done) {
      var result = []
      var error = new Error("something wrong")

      bus.on(event, function firstListener() {
        result.push(1)
      })

      bus.on(event, {
        fn: function secondListener() {
          result.push(2)
        },
        before: "firstListener"
      })

      bus.on(event, {
        fn: function thirdListener() {
          result.push(3)
          throw error
        },
        first: true,
      })


      bus.fire(event).then(function() {
        done("should not fire")
      }).catch(function(err) {
        print( bus._runtime.stack )
        try {
          assert.equal(result.join(""), "3")
          assert.equal(err.origin, error)
          done()
        } catch (e) {
          done(e)
        }
      })
    })


    it("expect to break the listener loop", function(done) {
      var result = []
      var error = new Error("something wrong")

      bus.on(event, function firstListener() {
        result.push(1)
      })

      bus.on(event, {
        fn: function secondListener() {
          result.push(2)
        },
        before: "firstListener"
      })

      bus.on(event, {
        fn: function thirdListener() {
          result.push(3)
          throw error
        },
        first: true,
      })


      bus.fire(event).then(function() {
        done("should not fire")
      }).catch(function(err) {
        try {
          assert.equal(result.join(""), "3")
          assert.equal(err.origin, error)
          done()
        } catch (e) {
          done(e)
        }
      })
    })


    it("expect not effect parent listener loop", function(done){
      var result = []
      var error = new Error("something wrong")

      bus.on( event, function firstListener(){
        result.push(1)
      })

      bus.on( event,{
        fn:function secondListener(){
          result.push(2)
        },
        before : "firstListener"
      })

      bus.on( event,{
        fn:function thirdListener( ){
          result.push(3)
          return this.fire(childEvent)
        },
        first: true,
      })

      bus.on( childEvent,function childEventListener(  ){
        result.push(4)
        return this.fire(descendantEvent)
      })

      bus.on( descendantEvent, function descendantListener(){
        result.push(5)
        //这是运行时的error所以会打断listener循环，并且reject promise
        throw error
      })

      bus.on( descendantEvent, function descendantListener2(){
        //前面一个监听器的error会打断listener循环，所以这里不会执行
        result.push(6)
      })

      bus.fire(event).then(function(){
        done("should not fire")
      }).catch(function(err){
        try{
          assert.equal( result.join(""), "34521")
          assert.equal(err.origin, error)
          done()
        }catch(e){
          done(e)
        }

      })
    })


    it("expect error stack correct with BusError", function(done){
      var result = []
      var errorData = {message:"custom error message"}
      var errorCode = 404

      bus.on( event, function firstListener(){
        result.push(1)
      })

      bus.on( event,{
        fn:function secondListener(){
          result.push(2)
        },
        before : "firstListener"
      })

      bus.on( event,{
        fn:function thirdListener( ){
          result.push(3)
          return this.fire(childEvent)
        },
        first: true,
      })

      bus.on( childEvent,function childEventListener(  ){
        result.push(4)
        return this.fire(descendantEvent)
      })

      bus.on( descendantEvent, function descendantListener(){
        result.push(5)
        //这是运行时的error所以会打断listener循环，并且reject promise
        return this.error(errorCode,errorData)
      })

      bus.on( descendantEvent, function descendantListener2(){
        //前面一个监听器的error会打断listener循环，所以这里不会执行
        result.push(6)
      })

      bus.fire(event).then(function(){
        done("should not fire")
      }).catch(function(err){
        try{
          //console.log( err.stack)
          assert.equal( result.join(""), "34521")
          assert.equal(err.data, errorData)
          assert.equal(err.code, errorCode)
          done()
        }catch(e){
          done(e)
        }

      })
    })


  })
}

