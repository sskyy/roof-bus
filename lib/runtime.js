'use strict'
const util = require('./util.js')

class BusRuntime {
  constructor() {
    this.data = {}
    this.firing = {}
  }

  generateEventRuntime(listenerRuntimeKey, event, listeners) {
    const runtimeData = {
      event: util.cloneDeep(event),
      data: {
        global: {},
        shared: {}
      },
      listeners: util.indexBy(listeners.toArray().map(listener=> {
        return util.extend(util.pick(listener, [ 'name', 'indexName', 'module' ]), {
          childEvents: []
        })
      }), 'indexName')
    }

    let newEventRuntimeKey
    if (listenerRuntimeKey !== undefined) {
      const childEvents = util.getRef(this.data, listenerRuntimeKey).childEvents

      //save runtime data to the tree
      childEvents.push(runtimeData)
      newEventRuntimeKey = listenerRuntimeKey.concat('childEvents', childEvents.length - 1)
    } else {
      this.data = runtimeData
      newEventRuntimeKey = []
    }

    return newEventRuntimeKey
  }

  getListenerRuntimeKey(eventRuntimeKey, listenerIndexName) {
    return eventRuntimeKey.concat('listeners', listenerIndexName)
  }

  recordFiring(eventName) {
    this.firing[ eventName ] = true
  }

  removeFiringRecord(eventName) {
    this.firing[ eventName ] = false
  }

  isFiring(eventName) {
    return ! ! this.firing[ eventName ]
  }

  getRuntime(runtimeKey) {
    return util.getRef(this.data, runtimeKey || [])
  }


}

module.exports = BusRuntime

