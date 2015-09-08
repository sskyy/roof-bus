var assert = require("assert")


module.exports = function( Bus ){
  describe("add listener and fire",function(){
    //return
    var bus
    beforeEach(function(done){
      bus = new Bus
      done()
    })

    it("add listener", function(){
      var event = "dance"
      bus.on( event, function firstListener( eventArg ){})

      bus.on( event,{
        fn:function secondListener( eventArg ){},
        before : "firstListener"
      })

      bus.on( event,{
        fn:function thirdListener( eventArg ){},
        first: true
      })

      //console.log( [...bus._eventListenerMap.get(event)._list.entries()] )
      //console.log( [...bus._eventListenerMap.get(event)._waitList] )
      var rawListenerList = bus.getListenersFor(event).toArray()

      assert.equal(rawListenerList.length, 3)
      assert.equal(rawListenerList[0].name, "thirdListener")
      assert.equal(rawListenerList[1].name, "secondListener")
      assert.equal(rawListenerList[2].name, "firstListener")
      //assert.equal(bus._listenerStack.string[event].listeners[0].name, "thirdListener")
      //assert.equal(bus._listenerStack.string[event].listeners[0].module.toString(), "")
    })

    it("fire event",function(done){
      var event = "sing"
      var arg =  ["lost+","start from bottom"]
      var fired = false

      bus.on(event,function firstListener(){
        var eventArg = Array.prototype.slice.call(arguments, 0)
        eventArg.forEach( function(singleArg,i){
          assert.equal( singleArg, arg[i])
        })
        fired = true
      })


      bus.fire.apply(bus, [event].concat(arg)).then(function(){
        assert.equal( fired, true)
        done()
      }).catch(done)
    })

    it("fire event in a promise",function(done){

      var event = "sing"
      var anotherEvent = "dance"
      var arg =  ["lost+","start from bottom"]
      var firstFired = false
      var secondFired = false

      bus.on(event,function firstListener(){
        var eventArg = Array.prototype.slice.call(arguments, 0)
        eventArg.forEach( function(singleArg,i){
          assert.equal( singleArg, arg[i])
        })

        var that = this
        firstFired = true
        return new Promise(function(resolve, reject){
          //不要忘记resolve
          setTimeout(function(){
            that.fire.apply(that, [anotherEvent].concat(eventArg)).then(resolve).catch(reject)
          }, 100)
        })
      })

      bus.on(anotherEvent, function sendListener(){
        var eventArg = Array.prototype.slice.call(arguments, 0)
        secondFired = true
        eventArg.forEach( function(singleArg,i){
          assert.equal( singleArg, arg[i])
        })
      })

      bus.fire.apply(bus,[event].concat( arg)).then(function(){
        assert.equal( firstFired, true)
        assert.equal( secondFired, true)
        done()
      }).catch(done)
    })


  })
}



