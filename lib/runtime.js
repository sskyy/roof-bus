'use strict'
const util = require('./util.js')

class BusRuntime {
  constructor() {
    this.data = {}
  }

  generateEventRuntime(listenerRuntimeKey, event, listeners) {
    const runtimeData = {
      event: util.cloneDeep(event),
      childEventsToMute: [],
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
      runtimeData.childEventsToMute = util.getRef(this.data, listenerRuntimeKey.slice(0, listenerRuntimeKey - 2)).childEventsToMute.slice(0)
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

  getData(eventRuntimeKey) {
    const eventRuntime = util.getRef(this.data,eventRuntimeKey || [])
    return eventRuntime.data.shared
  }

  getRuntime( runtimeKey ){

    return util.getRef( this.data, runtimeKey)

  }


}

module.exports = BusRuntime

