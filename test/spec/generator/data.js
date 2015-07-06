import Bus from "../../../src/generator"
import assert from "assert"
import co from 'co'

  describe("listener fire mute",()=>{
    //return
    var bus
    var event = "dance"
    var childEvent = "sing"
    var descendantEvent = "shoot"

    beforeEach(()=>{
      bus = new Bus
    })

    it('get data proxy as yield result', function(done){

      co( function *(){

        var eventData = {key:"name",value:"jason"}
        var eventObjectData = {key:"person", value:{name:"lufy"}}
        bus.on( event, function firstListener(){
            this.data.set(eventData.key, eventData.value)
            this.data.set(eventObjectData.key, eventObjectData.value)
          })

        var result = yield bus.fire(event)
        console.log( result)
        assert.equal(result.data.get(eventData.key), eventData.value)
        assert.equal(result.data.get(eventObjectData.key), eventObjectData.value)

      }).then(r=>{
        done()
      }).catch(e=>{
        done(e)
      })
    })

    it("child data share", (done)=>{
      var eventData = {key:"name",value:"jason"}
      var childDventData = {key:"name",value:"lopes"}
      var descendantEventData = {key:"name",value:"clark"}

      co(function* (){

        bus.on( event, function* firstListener(){
          this.data.set(eventData.key, eventData.value)
        })

        bus.on( event,{
          fn:function* secondListener(){
            assert.equal( this.data.get(eventData.key), eventData.value)
            yield this.fire(childEvent)
          }
        })

        bus.on( childEvent,function* childEventListener(){
          assert.equal( this.data.get(eventData.key), undefined)
          this.data.set(childDventData.key, childDventData.value)
          var descendantResult = yield this.fire(descendantEvent)

          assert.equal(descendantResult.data.get(descendantEventData.key), descendantEventData.value)
        })

        bus.on( descendantEvent, function* descendantListener(){

          assert.equal( this.data.get(childDventData.key), undefined)

          this.data.set(descendantEventData.key, descendantEventData.value)
        })

        bus.on( descendantEvent, function* descendantListener2(){
          assert.equal( this.data.get(descendantEventData.key), descendantEventData.value)
        })

        yield bus.fire(event)

      }).then(()=>{
        done()
      }).catch( e=>{
        console.trace(e)
        done("failed")
      })
    })


    it("global data share", (done)=>{
      var eventData = {key:"person1.name",value:"jason"}
      var childDventData = {key:"person2.name",value:"lopes"}
      var descendantEventData = {key:"person3.name",value:"clark"}


      co(function* (){
        bus.on( event, function* firstListener(){
          this.data.global.set(eventData.key, eventData.value)
        })

        bus.on( event,{
          fn:function* secondListener(){
            assert.equal( this.data.get(eventData.key), undefined)
            yield this.fire(childEvent)
          }
        })

        bus.on( childEvent,function* childEventListener(){
          this.data.global.set(childDventData.key, childDventData.value)
          assert.equal( this.data.get(childDventData.key), undefined)
          yield this.fire(descendantEvent)
        })

        bus.on( descendantEvent, function* descendantListener(){
          assert.equal( this.data.get(childDventData.key), undefined)
          this.data.global.set(descendantEventData.key, descendantEventData.value)
        })

        bus.on( descendantEvent, function* descendantListener2(){
          assert.equal( this.data.global.get(eventData.key), eventData.value)
        })


        var result = yield bus.fire(event)

        assert.equal( result.data.global.get(eventData.key), eventData.value)
        assert.equal( result.data.global.get(childDventData.key), childDventData.value)
        assert.equal( result.data.global.get(descendantEventData.key), descendantEventData.value)
        assert.equal( JSON.stringify(result.data.global.get("person1")),JSON.stringify({name:eventData.value}))

      }).then(function(){
        done()
      }).catch(done)



    })

  })
