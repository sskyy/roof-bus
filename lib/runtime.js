'use strict'
const util = require('./util.js')

class BusRuntime {
  constructor() {
    this.data = {}
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
          childEvents: [],
          result: null
        })
      }), 'indexName')
    }

    let newEventRuntimeKey
    if (listenerRuntimeKey !== undefined) {
      const childEvents = util.getRef(this.data, listenerRuntimeKey).childEvents
      //extend parent ChildEventsToMute

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

  storeResult(listenerRuntimeKey, result) {
    const runtime = util.getRef(this.data, listenerRuntimeKey)
    runtime.result = result
  }

  getRuntime( runtimeKey ){
    return util.getRef( this.data, runtimeKey || [])
  }


}

module.exports = BusRuntime

