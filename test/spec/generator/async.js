'use strict'
const Bus = require('../../../lib/generator')
const assert = require('assert')

describe('Async listener test', function () {
  //return
  let bus
  const event = 'dance'
  const childEvent = 'sing'
  const descendantEvent = 'shoot'

  beforeEach(function () {
    bus = new Bus
  })

  it('waitFor with no async signal', function (done) {
    const result = []

    bus.on(event, {
      fn: function secondListener() {
        result.push(2)
      },
      waitFor: 'firstListener'
    })

    bus.on(event, function firstListener() {
      return new Promise(function (resolve) {
        setTimeout(function () {
          result.push(1)
          resolve()
        }, 500)
      })
    })

    bus.fire(event).then(function () {
      assert.equal(result.join(''), '12')
      done()
    }).catch(function (err) {
      done(err)
    })
  })


  it('waitFor async listener', function (done) {
    const result = []


    bus.on(event, {
      fn: function secondListener() {
        result.push(2)
      },
      waitFor: 'firstListener'
    })

    bus.on(event, {
      fn: function firstListener() {
        return new Promise(function (resolve) {
          setTimeout(function () {
            result.push(1)
            resolve()
          }, 500)
        })
      },
      async: true
    })

    bus.fire(event).then(function () {
      assert.equal(result.join(''), '12')
      done()
    }).catch(function (err) {
      done(err)
    })
  })


  it('async with multiple other listeners', function (done) {
    const result = []
    bus.on(event, {
      fn: function firstListener() {
        return new Promise(function (resolve) {
          setTimeout(function () {
            result.push(1)
            resolve()
          }, 500)
        })
      },
      async: true
    })

    bus.on(event, {
      fn: function secondListener() {
        result.push(2)
      },
      waitFor: 'firstListener'
    })

    bus.on(event, {
      fn: function thirdListener() {
        result.push(3)
      }
    })

    bus.fire(event).then(function () {
      assert.equal(result.join(''), '312')
      done()
    }).catch(function (err) {
      done(err)
    })
  })


  it('blockFor', function (done) {
    const result = []
    bus.on(event, {
      fn: function firstListener() {
        return new Promise(function (resolve) {
          setTimeout(function () {
            result.push(1)
            resolve()
          }, 500)
        })
      },
      async : true,
      before : 'secondListener',
      blockFor: 'secondListener'
    })

    bus.on(event, {
      fn: function secondListener() {
        result.push(2)
      }
    })

    bus.on(event, {
      fn: function thirdListener() {
        result.push(3)
      }
    })

    bus.fire(event).then(function () {
      assert.equal(result.join(''), '312')
      done()
    }).catch(function (err) {
      done(err)
    })
  })

})






