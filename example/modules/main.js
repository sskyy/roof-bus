module.exports = function( bus ){
  bus.on('start', function(){
    this.data.global.set('response','hello visitor')
  })
}