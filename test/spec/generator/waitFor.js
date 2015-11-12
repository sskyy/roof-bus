var Bus = require( "../../../lib/generator")
var assert = require( "assert")

describe("waitFor",function() {
    //return
    var bus
    var event = "dance"
    var childEvent = "sing"
    var descendantEvent = "shoot"

    beforeEach(function() {
        bus = new Bus
    })


    it("waitFor with no aysnc signal", function(done){
        var result = []
        bus.on( event, function firstListener(){
            return new Promise(function(resolve,reject){
                setTimeout(function(){
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

        bus.fire(event).then(function(){
            assert.equal(result.join(""),"132")
            done()
        }).catch(function(err)
        {
            done(err)
        })
    })


    it("blockFor as return signal", function(done){
        var result = []
        bus.on( event,{
            fn: function firstListener(){
                return this.result(new Promise(function(resolve,reject){
                    setTimeout(function(){
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

        bus.fire(event).then(function(){
            assert.equal(result.join(""),"312")
            done()
        }).catch(function(err){
            console.log(err)
            done(err)
        })
    })
})






