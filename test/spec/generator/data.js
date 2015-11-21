'use strict'
const assert = require('assert')
const Bus = require('../../../index.js')
const co = require('co')

describe('listener fire mute', function () {
  //return
  let bus
  const event = 'dance'
  const childEvent = 'sing'
  const descendantEvent = 'shoot'

  beforeEach(function () {
    bus = new Bus
  })

  it('Listeners should share data', function (done) {
    var eventData = { key: 'nameA', value: 'jason' }
    var childEventData = { key: 'nameB', value: 'lopes' }
    var descendantEventData = { key: 'nameC', value: 'clark' }

    bus.on(event, function firstListener() {
      this.set(eventData.key, eventData.value)
    })

    bus.on(event, {
      fn: function secondListener() {
        assert.equal(this.get(eventData.key), eventData.value)
        return this.fire(childEvent)
      }
    })

    bus.on(childEvent, function childEventListener() {
      assert.equal(this.get(eventData.key), undefined)
      this.set(childEventData.key, childEventData.value)
      return this.fire(descendantEvent)
    })

    bus.on(descendantEvent, function descendantListener() {
      assert.equal(this.get(childEventData.key), undefined)
      this.set(descendantEventData.key, descendantEventData.value)
    })

    bus.on(descendantEvent, function descendantListener2() {
      assert.equal(this.get(descendantEventData.key), descendantEventData.value)
      assert.equal(this.get(childEventData.key), undefined)
    })

    bus.fire(event).then(function () {
      done()
    }).catch(done)
  })

  it('Use global to share data', function (done) {
    var eventData = { key: 'person1.name', value: 'jason' }
    var childEventData = { key: 'person2.name', value: 'lopes' }
    var descendantEventData = { key: 'person3.name', value: 'clark' }

    bus.on(event, function firstListener() {
      this.setGlobal(eventData.key, eventData.value)
    })

    bus.on(event, {
      fn: function secondListener() {
        assert.equal(this.get(eventData.key), undefined)
        return this.fire(childEvent)
      }
    })

    bus.on(childEvent, function childEventListener() {
      this.setGlobal(childEventData.key, childEventData.value)
      assert.equal(this.get(childEventData.key), undefined)
      return this.fire(descendantEvent)
    })

    bus.on(descendantEvent, function descendantListener() {
      assert.equal(this.get(childEventData.key), undefined)
      this.setGlobal(descendantEventData.key, descendantEventData.value)
    })

    bus.on(descendantEvent, function descendantListener2() {
      assert.equal(this.getGlobal(eventData.key), eventData.value)
    })


    bus.fire(event).then(function () {
      assert.equal(bus.getGlobal(eventData.key), eventData.value)
      assert.equal(bus.getGlobal(childEventData.key), childEventData.value)
      assert.equal(bus.getGlobal(descendantEventData.key), descendantEventData.value)
      //this 指针和bus相同
      assert.equal(this, bus)
      done()
    }).catch(function (err) {
      done(err)
    })
  })

  it('Get Data of bus fire result', function(done) {
    var eventData = { key: 'person1.name', value: 'jason' }
    var childEventData = { key: 'person2.name', value: 'lopes' }
    var descendantEventData = { key: 'person3.name', value: 'clark' }

    bus.on(event, function firstListener() {
      this.setGlobal(eventData.key, eventData.value)
    })

    bus.on(event, {
      fn: function secondListener() {
        assert.equal(this.get(eventData.key), undefined)
        return this.fire(childEvent)
      }
    })

    bus.on(childEvent, function childEventListener() {
      this.setGlobal(childEventData.key, childEventData.value)
      assert.equal(this.get(childEventData.key), undefined)
      return this.fire(descendantEvent)
    })

    bus.on(descendantEvent, function descendantListener() {
      assert.equal(this.get(childEventData.key), undefined)
      this.setGlobal(descendantEventData.key, descendantEventData.value)
    })


    co(function *() {
      const result = yield bus.fire(event)

      assert.equal(result.getGlobal(eventData.key), eventData.value)
      assert.equal(bus.getGlobal(childEventData.key), childEventData.value)
      assert.equal(bus.getGlobal(descendantEventData.key), descendantEventData.value)

      done()
    }).catch(done)
  })

})


