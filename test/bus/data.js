import assert from "assert"

module.exports = function( Bus ){
  describe("listener fire mute",function(){
    //return
    var bus
    var event = "dance"
    var childEvent = "sing"
    var descendantEvent = "shoot"

    beforeEach(function(){
      bus = new Bus
    })

    it("child data share", function(done){
      var eventData = {key:"name",value:"jason"}
      var childDventData = {key:"name",value:"lopes"}
      var descendantEventData = {key:"name",value:"clark"}

      bus.on( event, function firstListener(){
        this.data.set(eventData.key, eventData.value)
      })

      bus.on( event,{
        fn:function secondListener(){
          assert.equal( this.data.get(eventData.key), eventData.value)
          return this.fire(childEvent)
        }
      })

      bus.on( childEvent,function childEventListener(  ){
        assert.equal( this.data.get(eventData.key), undefined)
        this.data.set(childDventData.key, childDventData.value)
        return this.fire(descendantEvent)
      })

      bus.on( descendantEvent, function descendantListener(){
        assert.equal( this.data.get(childDventData.key), undefined)
        this.data.set(descendantEventData.key, descendantEventData.value)
      })

      bus.on( descendantEvent, function descendantListener2(){
        assert.equal( this.data.get(descendantEventData.key), descendantEventData.value)
      })

      bus.fire(event).then(function(){
        done()
      }).catch((...arg)=>{
        console.log(arg)
        done(arg)
      })
    })


    it("global data share", function(done){
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
      }).catch(function(err){
        done(err)
      })
    })

  })
}
