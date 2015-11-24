/* eslint-disable no-console */
'use strict'

var _defaultHandlers = {
  debug: {
    debug: function () {
      var args = Array.prototype.slice.call(arguments, 0)
      return console.log.apply(console, args)
    },
    log: function () {
      var args = Array.prototype.slice.call(arguments, 0)
      return console.log.apply(console, args)
    }
  },
  info: {
    info: function () {
      var args = Array.prototype.slice.call(arguments, 0)
      return console.info.apply(console, args)
    }
  },
  warn: {
    warn: function () {
      var args = Array.prototype.slice.call(arguments, 0)
      return console.warn.apply(console, args)
    }
  },
  error: {
    error: function () {
      var args = Array.prototype.slice.call(arguments, 0)
      return console.error.apply(console, args)
    }
  }
}


class Debug {
  constructor(level, handlers) {
    this.level = level || 'debug'
    this.levelMap = {
      'debug': 0,
      'info': 1,
      'warn': 2,
      'error': 3
    }

    var container = [ _defaultHandlers, handlers ]
    var that = this
    container.forEach(function (c) {
      if (! c) return

      for (let handlerLevel in c) {
        for (let handlerName in c[ handlerLevel ]) {
          that.register(handlerLevel, handlerName, c[ handlerLevel ][ handlerName ])
        }
      }
    })
  }

  register(level, name, handler) {
    if (this.levelMap[ level ] >= this.levelMap[ this.level ]) {
      this[ name ] = handler
    }
  }
}

module.exports = Debug
