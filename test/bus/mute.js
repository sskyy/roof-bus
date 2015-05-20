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

  it("fire as expect", (done)=>{
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
        this.fire(childEvent)
      },
      first: true,
    })

    bus.on( childEvent,function childEventListener(  ){
        result.push(4)
        this.fire(descendantEvent)
    })

    bus.on( descendantEvent, function descendantListener(){
      result.push(5)
    })

    bus.fire(event).then(()=>{
      assert.equal(result.join(""),"34521")
      done()
    }).catch((...arg)=>{
      console.log(arg)
      done(arg)
    })
  })


  it("mute from listener",(done)=>{
    var originListenerFired = false
    var childListenerFiredTimes = 0

    bus.on( event, {
      fn:function originListener(){
        originListenerFired = true
      },
      mute : event
    })

    bus.on(event,{
      fn:function fireInteListener(){
        childListenerFiredTimes++
        //不会死循环，因为这里不会执行
        this.fire(event)
      }
    })


    bus.fire(event).then(()=>{

      //只能mute后代
      assert.equal(originListenerFired,true)
      assert.equal(childListenerFiredTimes,1)

      done()
    }).catch(err=>{
      console.log( "stack====>",err.stack)
      done(err)
    })
  })

  it("mute from fire",(done)=>{

    var childFired = false
    var descendantFired = false

    bus.on( event,{
      fn:function thirdListener( ){
        this.fire(childEvent)
      },
      first: true,
    })

    bus.on( childEvent,function childEventListener(  ){
      childFired = true
      this.fire(descendantEvent)
    })

    bus.on( descendantEvent, function descendantListener(){
      descendantFired = true
    })

    bus.fire({name:event,mute:descendantEvent}).then(()=>{
      assert.equal(childFired,true)
      assert.equal(descendantFired,false)
      done()
    }).catch((...arg)=>{
      console.log(arg)
      done(arg)
    })
  })


  it("fire as expect", (done)=>{
    bus.on( event, function firstListener( eventArg ){})

    bus.on( event,{
      fn:function secondListener( eventArg ){},
      before : "firstListener"
    })

    bus.on( event,{
      fn:function thirdListener( eventArg ){
        this.fire(childEvent)
      },
      first: true,
      mute : event
    })

    bus.on( childEvent,{
      fn:function childEventListener( eventArg ){
        this.fire(descendantEvent)
      },
      first: true,
      mute : event
    })

    bus.on( descendantEvent, function descendantListener(){})
    done()
  })

  it("mute on the run",(done)=>{
    var childFired = false
    var descendantFired = false

    bus.on( event,{
      fn:function FirstListener( ){
        //无法使用signal mute自己先fire的的事件,只能mute后面触发的子孙
        //this.fire(childEvent)
        return this.result({
          mute : descendantEvent
        })
      },
      first: true,
    })

    bus.on( event, function SecondListener(){
      this.fire(childEvent)
    })

    bus.on( childEvent,function childEventListener(  ){
      childFired = true
      //console.log(childFired,"fired")
      this.fire(descendantEvent)
    })

    bus.on( descendantEvent, function descendantListener(){
      //console.log(descendantEvent,"fired")
      descendantFired = true
    })

    bus.fire(event).then(()=>{
      assert.equal(childFired,true)
      assert.equal(descendantFired,false)
      done()
    }).catch((err)=>{
      console.log("something run! ==>",err)
      done(err)
    })
  })
})
