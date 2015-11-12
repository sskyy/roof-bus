module.exports = function (bus) {
  bus.on('start', {
    fn: function (url) {
      if (/dashboard$/.test(url)) {
        return this.error(503, {msg: 'you should not be here'})
      }
    },
    first: true
  })
}