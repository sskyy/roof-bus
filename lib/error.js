'use strict'

function isNumber(obj) {
  return typeof obj === 'number'
}

class BusError {
  constructor(code, data, stack, asyncErrors) {
    if (! isNumber(code)) {
      data = code
      code = 500
    }

    this.code = code
    if (data instanceof Error) {
      this.data = { message: data.message }
      if (data.stack) {
        this.stack = data.stack.split(/\n/)
      }
    } else {
      this.data = data
      //去掉没用的两个stack
      if (stack) {
        this.stack = stack
      } else {
        var fakeError = new Error()
        if (fakeError.stack) {
          let stackArray = new Error().stack.split(/\n/)
          this.stack = stackArray.slice(0, 1).concat(stackArray.slice(3))
        }
      }
    }

    this.$class = (data === undefined || data === null) ? 'Null' : data.constructor.name
    this.origin = data
    this.asyncErrors = asyncErrors
  }

  fixES6() {
    //Babel 的 bug
  }
}

module.exports = BusError
