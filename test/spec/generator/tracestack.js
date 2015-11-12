var Bus = require( "../../../lib/generator")
var assert = require( "assert")
var prettyjson = require( "prettyjson")
var print = function( obj ){
    console.log( prettyjson.render(obj))
}

describe("tracestack test",function(){
    //return
    var bus
    var event = "dance"
    var childEvent = "sing"
    var descendantEvent = "shoot"

    beforeEach(function(){
        bus = new Bus
    })

    it("expect tracestack have right properties", function(done){
        var listenerResult = {a : 1}
        var listener = function firstListener(){
            return listenerResult
        }
        bus.on(event, listener)

        bus.fire(event).then(function(){
            try{
                //console.log("aaa",bus.stack)
                print( bus._runtime.stack )
                //console.log(bus.getListenersFor(event) )
                var currentStack = bus._runtime.stack[0]
                assert.equal( currentStack.$class,  'event')
                assert.equal( currentStack.event.name,  event)

                var listeners = bus.getListenersFor(event).toArray()
                assert.equal( Object.keys(currentStack.listeners).length,  listeners.length)

                var stackListenerNames = Object.keys(currentStack.listeners).sort().join(",")
                var listenerNames = listeners.map(function(listener){return listener.name}).sort().join(",")
                assert.equal( stackListenerNames,  listenerNames)
                var stackListener = currentStack.listeners[listener.name]
                assert.equal(stackListener.$class,'listener')
                assert.equal(stackListener.stack.length,0)
                assert.equal(stackListener.result.$class, listenerResult.constructor.name)
                assert.equal(stackListener.result.data,listenerResult)
                //print(stackListener.result)
                done()
            }catch(e){
                done(e)
            }
        })

    })


    //it("expect have right listener stack", (done)=> {
    //
    //})
    //
    //
    //it("expect have right event stack", (done)=> {
    //
    //})
    //
    //
    //it("expect have right error in stack", (done)=>{
    //
    //})

})


