import Bus from "../../src/index"
import assert from "assert"

describe("listener fire mute",()=>{
  //return
  var bus
  var event = "dance"
  var childEvent = "sing"
  var descendantEvent = "shoot"

  beforeEach(()=>{
    bus = new Bus
  })

  it("child data share", (done)=>{
    var eventData = {key:"name",value:"jason"}
    var childDventData = {key:"name",value:"lopes"}
    var descendantEventData = {key:"name",value:"clark"}

    bus.on( event, function firstListener(){
      this.data.set(eventData.key, eventData.value)
    })

    bus.on( event,{
      fn:function secondListener(){
        assert.equal( this.data.get(eventData.key), eventData.value)
        this.fire(childEvent)
      }
    })

    bus.on( childEvent,function childEventListener(  ){
      assert.equal( this.data.get(eventData.key), undefined)
      this.data.set(childDventData.key, childDventData.value)
      this.fire(descendantEvent)
    })

    bus.on( descendantEvent, function descendantListener(){
      assert.equal( this.data.get(childDventData.key), undefined)
      this.data.set(descendantEventData.key, descendantEventData.value)
    })

    bus.on( descendantEvent, function descendantListener2(){
      assert.equal( this.data.get(descendantEventData.key), descendantEventData.value)
    })

    bus.fire(event).then(()=>{
      done()
    }).catch((...arg)=>{
      console.log(arg)
      done(arg)
    })
  })


  it("global data share", (done)=>{
    var eventData = {key:"person1.name",value:"jason"}
    var childDventData = {key:"person2.name",value:"lopes"}
    var descendantEventData = {key:"person3.name",value:"clark"}

    bus.on( event, function firstListener(){
      this.data.global.set(eventData.key, eventData.value)
    })

    bus.on( event,{
      fn:function secondListener(){
        assert.equal( this.data.get(eventData.key), undefined)
        return this.fire(childEvent)
      }
    })

    bus.on( childEvent,function childEventListener(){
      this.data.global.set(childDventData.key, childDventData.value)
      assert.equal( this.data.get(childDventData.key), undefined)
      return this.fire(descendantEvent)
    })

    bus.on( descendantEvent, function descendantListener(){
      assert.equal( this.data.get(childDventData.key), undefined)
      this.data.global.set(descendantEventData.key, descendantEventData.value)
    })

    bus.on( descendantEvent, function descendantListener2(){
      assert.equal( this.data.global.get(eventData.key), eventData.value)
    })


    bus.fire(event).then(function(){
      assert.equal( bus.data.global.get(eventData.key), eventData.value)
      assert.equal( bus.data.global.get(childDventData.key), childDventData.value)
      assert.equal( bus.data.global.get(descendantEventData.key), descendantEventData.value)
      assert.equal( JSON.stringify(bus.data.global.get("person1")),JSON.stringify({name:eventData.value}))
      //this 指针和bus相同
      assert.equal( this, bus )
      done()
    }).catch((err)=>{
      done(err)
    })
  })

})
