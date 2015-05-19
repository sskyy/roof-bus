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

  it("target as expect", (done)=>{
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
    })

    bus.fire({name:event,target:"secondListener"}).then(()=>{
      assert.equal(result.join(""),"2")
      done()
    }).catch((err)=>{
      console.log(err)
      done(err)
    })
  })

  it("target multiple", (done)=>{
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
      first: true
    })

    bus.fire({name:event,target:["secondListener","firstListener"]}).then(()=>{
      assert.equal(result.join(""),"21")
      done()
    }).catch((err)=>{
      console.log(err)
      done(err)
    })
  })

  //it("disable in fire", (done)=>{
  //  var result = []
  //  bus.on( event, function firstListener(){
  //    result.push(1)
  //  })
  //
  //  bus.fire({name:event,disable:"firstListener"}).then(()=>{
  //    assert.equal(result.join(""),"")
  //    done()
  //  }).catch((err)=>{
  //    console.log(err)
  //    done(err)
  //  })
  //})
  //
  //it("disable in child stack", (done)=>{
  //  var childListenerFired = false
  //  var childListenerFired2 = false
  //  var childListenerFired3 = false
  //  bus.on( event, function firstListener(){
  //    this.fire({name:childEvent,disable:"childListener"})
  //  })
  //
  //  bus.on(childEvent,function childListener(){
  //    childListenerFired = true
  //  })
  //
  //  bus.on( childEvent, {fn:function childListener2(){
  //    childListenerFired2 = true
  //  },disable:"childListener3"})
  //
  //  bus.on( childEvent, function childListener3(){
  //    childListenerFired3 = true
  //  })
  //
  //  bus.fire({name:event}).then(()=>{
  //    assert.equal( childListenerFired, false)
  //    assert.equal( childListenerFired2, true)
  //    assert.equal( childListenerFired3, false)
  //    done()
  //  }).catch((err)=>{
  //    console.log(err)
  //    done(err)
  //  })
  //})

})
