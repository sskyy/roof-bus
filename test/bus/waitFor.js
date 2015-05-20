import Bus from "../../src/index"
import assert from "assert"

describe("waitFor",()=> {
  //return
  var bus
  var event = "dance"
  var childEvent = "sing"
  var descendantEvent = "shoot"

  beforeEach(()=> {
    bus = new Bus
  })


  it("waitFor as expect", (done)=>{
    var result = []
    bus.on( event, function firstListener(){
      return new Promise((resolve,reject)=>{
        setTimeout(()=>{
          console.log("pushing data")
          result.push(1)
          resolve()
        },500)
      })
    })

    bus.on( event,{
      fn:function secondListener(){
        result.push(2)
      },
      waitFor : "firstListener"
    })

    bus.on( event,{
      fn:function thirdListener( ){
        result.push(3)
      }
    })

    bus.fire(event).then(()=>{
      assert.equal(result.join(""),"312")
      done()
    }).catch((err)=>{
      console.log(err)
      done(err)
    })
  })

  it("blockFor as expect", (done)=>{
    var result = []
    bus.on( event,{
      fn: function firstListener(){
        return new Promise((resolve,reject)=>{
          setTimeout(()=>{
            console.log("pushing data")
            result.push(1)
            resolve()
          },500)
        })
      },
      blockFor:"secondListener"
    })

    bus.on( event,{
      fn:function secondListener(){
        result.push(2)
      }
    })

    bus.on( event,{
      fn:function thirdListener( ){
        result.push(3)
      }
    })

    bus.fire(event).then(()=>{
      assert.equal(result.join(""),"312")
      done()
    }).catch((err)=>{
      console.log(err)
      done(err)
    })
  })

  it("blockFor as return signal", (done)=>{
    var result = []
    bus.on( event,{
      fn: function firstListener(){
        return this.result(new Promise((resolve,reject)=>{
          setTimeout(()=>{
            result.push(1)
            resolve()
          },500)
        }),{
          blockFor:"secondListener"
        })
      }
    })

    bus.on( event,{
      fn:function secondListener(){
        result.push(2)
      }
    })

    bus.on( event,{
      fn:function thirdListener( ){
        result.push(3)
      }
    })

    bus.fire(event).then(()=>{
      assert.equal(result.join(""),"312")
      done()
    }).catch((err)=>{
      console.log(err)
      done(err)
    })
  })
})




