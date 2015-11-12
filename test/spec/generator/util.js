var Bus = require( "../../../lib/generator")
var assert = require( "assert")
var prettyjson = require( "prettyjson")
var print = function( obj ){
  console.log( prettyjson.render(obj))
}

describe('bus util test', function(){

  //return
  var bus
  var event = "dance"
  var childEvent = "sing"
  var descendantEvent = "shoot"

  beforeEach(function(){
    bus = new Bus
  })

  it('get all registered events', function(){
    function listener(){}
    bus.on(event, listener)
    bus.on(childEvent, listener)
    bus.on(descendantEvent, listener)

    assert.equal( bus.getEvents().join(''),[event,childEvent,descendantEvent].join(''))
  })

  it('get all listeners', function(){
    function listener1(){}
    function listener2(){}
    bus.on(event, listener1)
    bus.on(event, {
      fn: listener2,
      before : 'listener1'
    })

    var listeners = bus.getListeners(event).toArray()
    assert.equal( listeners[0].fn, listener2)
    assert.equal( listeners[0].event, event)
    assert.equal( listeners[1].fn, listener1)
  })
})
