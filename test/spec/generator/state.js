'use strict'
const Bus = require('../../../index.js')
const assert = require('assert')

describe('State test', function () {
  let bus
  const event = 'dance'
  const childEvent = 'sing'
  const descendantEvent = 'shoot'

  beforeEach(function () {
    bus = new Bus
  })

  it('Bus should record current firing event', function (done) {
    const result = []

    bus.on(event, function firstListener() {
      assert.equal(this.isFiring(event), true)
      result.push(1)
    })

    bus.on(event, {
      fn: function secondListener() {
        assert.equal(this.isFiring(event), true)
        result.push(2)
      },
      before: 'firstListener'
    })

    bus.on(event, {
      fn: function thirdListener() {
        assert.equal(this.isFiring(event), true)
        result.push(3)
      },
      first: true
    })


    bus.fire(event).then(function () {
      assert.equal(this.isFiring(event), false)
      done()
    }).catch(function (err) {
      done(err)
    })

    assert.equal(bus.isFiring(event), true)
  })


  it('Child listener should be able to listen to whole bus state', function (done) {

    bus.on(event, function firstListener() {
      return this.fire(childEvent)
    })

    bus.on(childEvent, {
      fn: function secondListener() {
        assert.equal(this.isFiring(event), true)
        assert.equal(this.isFiring(childEvent), true)
      }
    })

    bus.fire(event).then(function () {
      assert.equal(this.isFiring(event), false)
      assert.equal(this.isFiring(childEvent), false)
      done()
    }).catch(function (err) {
      done(err)
    })

    assert.equal(bus.isFiring(event), true)

  })


  it('onChange listener can detect fire change', function (done) {

    const changedEvent = []

    bus.onChange(function (err, eventName) {
      changedEvent.push(eventName)
      if (changedEvent.length > 2) {
        assert.equal(bus.isFiring(eventName), false)
      } else {
        assert.equal(bus.isFiring(eventName), true)
      }
    })

    bus.on(event, function firstListener() {
      return this.fire(childEvent)
    })

    bus.on(childEvent, {
      fn: function secondListener() {
        assert.equal(this.isFiring(event), true)
        assert.equal(this.isFiring(childEvent), true)
      }
    })

    bus.fire(event).then(function () {
      assert.equal(changedEvent.join(','), `${event},${childEvent},${childEvent},${event}`)
      done()
    }).catch(function (err) {
      done(err)
    })

    assert.equal(bus.isFiring(event), true)


  })

})

