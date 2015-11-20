'use strict'

class DataProxy {
  constructor(bus) {
    this.bus = bus
    this.global = {
      get(key) {
        return this.bus._runtime.getRuntime(this.bus._eventRuntimeKey).data.global[ key ]
      },
      set(key, value) {
        const runtime = this.bus._runtime.getRuntime(this.bus._eventRuntimeKey)
        runtime.data.global[ key ] = value
      }
    }
  }

  get(key) {
    return this.bus._runtime.getRuntime(this.bus._eventRuntimeKey).data.shared[ key ]
  }

  set(key, value) {
    const runtime = this.bus._runtime.getRuntime(this.bus._eventRuntimeKey)
    runtime.data.shared[ key ] = value
  }
}

export default DataProxy
