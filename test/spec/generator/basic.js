'use strict'
const assert = require('assert')
const Bus = require('../../../index.js')

describe('Basic listener listene and fire', ()=>{
  let bus
  beforeEach(()=>{
    bus = new Bus
  })

  it('add listener', function () {
    const event = 'dance'
    bus.on(event, function firstListener() {})

    bus.on(event, {
      fn: function secondListener() {},
      before: 'firstListener'
    })

    bus.on(event, {
      fn: function thirdListener() {},
      first: true
    })

    //console.log( [...bus._eventListenerMap.get(event)._list.entries()] )
    //console.log( [...bus._eventListenerMap.get(event)._waitList] )
    const rawListenerList = bus.getListenersFor(event).toArray()

    assert.equal(rawListenerList.length, 3)
    assert.equal(rawListenerList[ 0 ].name, 'thirdListener')
    assert.equal(rawListenerList[ 1 ].name, 'secondListener')
    assert.equal(rawListenerList[ 2 ].name, 'firstListener')
    //assert.equal(bus._listenerStack.string[event].listeners[0].name, 'thirdListener')
    //assert.equal(bus._listenerStack.string[event].listeners[0].module.toString(), '')
  })

  it('fire event', function (done) {
    const event = 'sing'
    const arg = [ 'lost+', 'start from bottom' ]
    let fired = false

    bus.on(event, function firstListener() {
      const  eventArg = Array.prototype.slice.call(arguments, 0)
      eventArg.forEach(function (singleArg, i) {
        assert.equal(singleArg, arg[ i ])
      })
      fired = true
    })

    bus.fire.apply(bus, [ event ].concat(arg)).then(function () {
      assert.equal(fired, true)
      done()
    }).catch(done)

  })

  it('fire event in a promise', function (done) {

    const event = 'sing'
    const anotherEvent = 'dance'
    const arg = [ 'lost+', 'start from bottom' ]
    let firstFired = false
    let secondFired = false

    bus.on(event, function firstListener() {
      const eventArg = Array.prototype.slice.call(arguments, 0)
      eventArg.forEach(function (singleArg, i) {
        assert.equal(singleArg, arg[ i ])
      })

      firstFired = true
      return new Promise((resolve, reject) =>{
        //不要忘记resolve
        setTimeout( () =>{
          this.fire.apply(this, [ anotherEvent ].concat(eventArg)).then(resolve).catch(reject)
        }, 100)
      })
    })

    bus.on(anotherEvent, function sendListener() {
      const eventArg = Array.prototype.slice.call(arguments, 0)
      secondFired = true
      eventArg.forEach(function (singleArg, i) {
        assert.equal(singleArg, arg[ i ])
      })
    })

    bus.fire.apply(bus, [ event ].concat(arg)).then(function () {
      assert.equal(firstFired, true)
      assert.equal(secondFired, true)
      done()
    }).catch(done)
  })

})




