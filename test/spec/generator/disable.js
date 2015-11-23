'use strict'
const assert = require('assert')
const Bus = require('../../../index.js')

describe('listener disable test', function () {
  //return
  let bus
  const event = 'dance'
  const childEvent = 'sing'

  beforeEach(function () {
    bus = new Bus
  })

  it('disable listener on register', function (done) {
    const result = []
    bus.on(event, function firstListener() {
      result.push(1)
    })
    bus.on(event, {
      fn: function secondListener() {
        result.push(2)
      },
      before: 'firstListener'
    })

    bus.on(event, {
      fn: function thirdListener() {
        result.push(3)
      },
      first: true,
      disable: 'secondListener'
    })

    bus.fire(event).then(function () {
      assert.equal(result.join(''), '31')
      done()
    }).catch(function (err) {
      console.log(err)
      done(err)
    })
  })

  it('disable when fire', function (done) {
    const result = []
    bus.on(event, function firstListener() {
      result.push(1)
    })

    bus.fire({ name: event, disable: 'firstListener' }).then(function () {
      assert.equal(result.join(''), '')
      done()
    }).catch(function (err) {
      console.log(err)
      done(err)
    })
  })


  it('disable in child stack', function (done) {
    let childListenerFired = false
    let childListenerFired2 = false
    let childListenerFired3 = false
    bus.on(event, function firstListener() {
      this.fire({ name: childEvent, disable: 'childListener' })
    })

    bus.on(childEvent, function childListener() {
      childListenerFired = true
    })

    bus.on(childEvent, {
      fn: function childListener2() {
        childListenerFired2 = true
      }, disable: 'childListener3'
    })

    bus.on(childEvent, function childListener3() {
      childListenerFired3 = true
    })

    bus.fire({ name: event }).then(function () {
      assert.equal(childListenerFired, false)
      assert.equal(childListenerFired2, true)
      assert.equal(childListenerFired3, false)
      done()
    }).catch(function (err) {
      console.log(err)
      done(err)
    })
  })


  it('disable on the fly', function (done) {
    const result = []
    bus.on(event, function firstListener() {
      result.push(1)
    })

    bus.on(event, {
      fn: function secondListener() {
        result.push(2)
      },
      before: 'firstListener'
    })

    bus.on(event, {
      fn: function thirdListener() {
        result.push(3)
        return this.result({
          disable: 'firstListener'
        })
      },
      first: true
    })

    bus.fire(event).then(function () {
      assert.equal(result.join(''), '32')
      done()
    }).catch(function (err) {
      console.log(err)
      done(err)
    })
  })
})

