'use strict'
const Bus = require('../../../index.js')
const assert = require('assert')

describe('Error test', function () {
  let bus
  const event = 'dance'
  const childEvent = 'sing'
  const descendantEvent = 'shoot'

  beforeEach(function () {
    bus = new Bus
  })

  it('Break the listener loop with build-in error', function (done) {
    const result = []
    const error = new Error('something wrong')

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
        throw error
      },
      first: true
    })


    bus.fire(event).then(function () {
      done('should not fire')
    }).catch(function (err) {
      try {
        assert.equal(err.code, 500)
        assert.equal(err.data.message, error.message)
        assert.equal(err.origin, error)
        assert.equal(result.join(''), '3')
        assert.equal(err.origin, error)
        done()
      } catch (e) {
        done(e)
      }
    })
  })


  it('Break the listener loop with roof bus error function', function (done) {
    const result = []
    const errorData = { msg: 'custom error' }

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
        return this.error(406, errorData)
      },
      first: true
    })


    bus.fire(event).then(function () {
      done('should not fire')
    }).catch(function (err) {
      try {
        assert.equal(err.code, 406)
        assert.equal(err.data, errorData)
        assert.equal(result.join(''), '3')
        done()
      } catch (e) {
        done(e)
      }
    })
  })


  it('Error in child listener can break whole firing process', function (done) {
    const result = []
    const error = new Error('something wrong')

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
        return this.fire(childEvent)
      },
      first: true
    })

    bus.on(childEvent, function childEventListener() {
      result.push(4)
      return this.fire(descendantEvent)
    })

    bus.on(descendantEvent, function descendantListener() {
      result.push(5)
      //Here! We use a error to break whole fire process.
      throw error
    })

    bus.on(descendantEvent, function descendantListener2() {
      //This won't execute cause error happened before.
      result.push(6)
    })

    bus.fire(event).then(function () {
      done('should not fire')
    }).catch(function (err) {
      try {
        //Note that the third listener registered himself first.
        assert.equal(result.join(''), '345')
        assert.equal(err.code, 500)
        assert.equal(err.data.message, error.message)
        assert.equal(err.origin, error)
        done()
      } catch (e) {
        done(e)
      }

    })
  })

})

