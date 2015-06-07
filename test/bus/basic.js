import Bus from "../../src/index"
import assert from "assert"

describe("add listener and fire",()=>{
  //return
  var bus
  beforeEach((done)=>{
    bus = new Bus
    done()
  })

  it("add listener", ()=>{
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

    console.log( [...bus._eventListenerMap.get(event)._list.entries()] )
    console.log( [...bus._eventListenerMap.get(event)._waitList] )
    var rawListenerList = bus.getListenersFor(event).toArray()

    assert.equal(rawListenerList.length, 3)
    assert.equal(rawListenerList[0].name, "thirdListener")
    assert.equal(rawListenerList[1].name, "secondListener")
    assert.equal(rawListenerList[2].name, "firstListener")
    //assert.equal(bus._listenerStack.string[event].listeners[0].name, "thirdListener")
    //assert.equal(bus._listenerStack.string[event].listeners[0].module.toString(), "")
  })

  it("fire event",(done)=>{
    var event = "sing"
    var arg =  ["lost+","start from bottom"]

    bus.on(event,function firstListener(...eventArg){
      eventArg.forEach( (singleArg,i) =>{
        assert.equal( singleArg, arg[i])
      })
      done()
    })

    bus.fire(event, ...arg)
  })

  it("fire event in a promise",(done)=>{

    var event = "sing"
    var anotherEvent = "dance"
    var arg =  ["lost+","start from bottom"]

    bus.on(event,function firstListener(...eventArg){
      eventArg.forEach( (singleArg,i) =>{
        assert.equal( singleArg, arg[i])
      })

      return new Promise((resolve, reject)=>{
        setTimeout(()=>{
          this.fire(anotherEvent, ...eventArg)
        }, 100)
      })

    })

    bus.on(anotherEvent, function sendListener(...eventArg){
      eventArg.forEach( (singleArg,i) =>{
        assert.equal( singleArg, arg[i])
      })
      done()
    })

    bus.fire(event, ...arg)

  })
})
