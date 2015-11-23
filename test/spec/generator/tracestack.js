'use strict'
const Bus = require('../../../lib/generator')
const assert = require('assert')
const prettyjson = require('prettyjson')
const print = function (obj) {
  console.log(prettyjson.render(obj))
}

describe('tracestack test', function () {
  //return
  let bus
  const event = 'dance'
  const childEvent = 'sing'
  const descendantEvent = 'shoot'

  beforeEach(function () {
    bus = new Bus
  })

  it('expect tracestack have right properties', function (done) {
    const listener = function firstListener() {
    }
    bus.on(event, listener)

    bus.fire(event).then(function () {
      try {
        print(bus._runtime.data)
        const currentStack = bus._runtime.data
        assert.equal(currentStack.event.name, event)
        //
        const listeners = bus.getListenersFor(event).toArray()
        assert.equal(Object.keys(currentStack.listeners).length, listeners.length)
        //
        const stackListenerNames = Object.keys(currentStack.listeners).sort().join(',')
        const listenerNames = listeners.map(function (listener) {
          return listener.name
        }).sort().join(',')
        assert.equal(stackListenerNames, listenerNames)
        const stackListener = currentStack.listeners[ listener.name ]
        assert.equal(stackListener.childEvents.length, 0)
        done()
      } catch (e) {
        done(e)
      }
    })
  })

  it('Test child tracestack ', function (done) {
    const listener = function firstListener() {
      this.fire(childEvent)
    }

    const childListener = function childListener() {
    }

    bus.on(event, listener)
    bus.on(childEvent, childListener)

    bus.fire(event).then(function () {
      try {
        print(bus._runtime.data)
        const currentStack = bus._runtime.data
        assert.equal(currentStack.event.name, event)
        const listeners = bus.getListenersFor(event).toArray()
        assert.equal(Object.keys(currentStack.listeners).length, listeners.length)

        const stackListener = currentStack.listeners[ listener.name ]
        assert.equal(stackListener.childEvents.length, 1)
        assert.equal(stackListener.childEvents[0].event.name, childEvent)
        const childListeners = bus.getListenersFor(childEvent).toArray()
        assert.equal(Object.keys(stackListener.childEvents[0].listeners).length, childListeners.length)
        assert.equal(stackListener.childEvents[0].listeners.childListener.childEvents.length, 0)

        done()
      } catch (e) {
        done(e)
      }
    })
  })


})


