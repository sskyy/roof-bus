var  assert = require("assert")

module.exports = function( Bus ){
  describe("listener fire mute",function(){
    //return
    var bus
    var event = "dance"
    var childEvent = "sing"
    var descendantEvent = "shoot"

    beforeEach(function(){
      bus = new Bus
    })

    it("disable as expect", function(done){
      var result = []
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
        },
        first: true,
        disable : "secondListener"
      })

      bus.fire(event).then(function(){
        assert.equal(result.join(""),"31")
        done()
      }).catch(function(err){
        console.log(err)
        done(err)
      })
    })

    it("disable in fire", function(done){
      var result = []
      bus.on( event, function firstListener(){
        result.push(1)
      })

      bus.fire({name:event,disable:"firstListener"}).then(function(){
        assert.equal(result.join(""),"")
        done()
      }).catch(function(err){
        console.log(err)
        done(err)
      })
    })

    it("disable in child stack", function(done){
      var childListenerFired = false
      var childListenerFired2 = false
      var childListenerFired3 = false
      bus.on( event, function firstListener(){
        this.fire({name:childEvent,disable:"childListener"})
      })

      bus.on(childEvent,function childListener(){
        childListenerFired = true
      })

      bus.on( childEvent, {fn:function childListener2(){
        childListenerFired2 = true
      },disable:"childListener3"})

      bus.on( childEvent, function childListener3(){
        childListenerFired3 = true
      })

      bus.fire({name:event}).then(function(){
        assert.equal( childListenerFired, false)
        assert.equal( childListenerFired2, true)
        assert.equal( childListenerFired3, false)
        done()
      }).catch(function(err){
        console.log(err)
        done(err)
      })
    })


    it("disable on the run", function(done){
      var result = []
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
          return this.result({
            disable : "firstListener"
          })
        },
        first: true
      })

      bus.fire(event).then(function(){
        assert.equal(result.join(""),"32")
        done()
      }).catch(function(err){
        console.log(err)
        done(err)
      })
    })
  })

}
