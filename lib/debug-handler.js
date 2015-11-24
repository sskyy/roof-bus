/* eslint-disable no-console */
'use strict'
var BusError = require('./error.js')

function redConsole(format) {
  var args = Array.prototype.slice.call(arguments, 1)
  console.log.apply(console, [ '%c' + format, 'color:red' ].concat(args))
}

function redDuckTypeConsole(tag, arg) {
  if (typeof  arg == 'object') {
    redConsole('%s : %O', tag, arg)
  } else {
    redConsole('%s : ', tag, arg)
  }
}

var handlers = {
  error: {
    error: function busErrorHandler() {
      var args = Array.prototype.slice.call(arguments, 0)
      if (console.group === undefined) {
        //服务器端
        console.group = function () {
        }
        console.groupEnd = function () {
        }
      }
      console.group('This is Roof dev message:')
      args.forEach(function (arg) {
        if (arg instanceof BusError) {
          console.group('Roof-Bus error')
          redConsole('code : %d', arg.code)
          redDuckTypeConsole('data', arg.data)
          redDuckTypeConsole('origin', arg.origin)
          redConsole('stack : %s', arg.stack.join('\n'))

          console.groupEnd()
        } else {
          console.error.call(console, arg)
        }
      })

      console.groupEnd()
    }
  }
}


module.exports = handlers
