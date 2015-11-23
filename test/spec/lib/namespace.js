var assert = require("assert")
var Namespace = require("../../../lib/Namespace.js")

describe("string extend test", function(){

  it("string equal",function(){
    var text = 'jason'
    var ns = new Namespace(text)
    console.log( `toString: ${ns}`)
    console.log('stringify:', JSON.stringify( ns ))
    console.log('toObject',  ns )
    //console.log(`======|${ns.valueOff()}|======`, ns.valueOf())
    assert.equal( ns == text, true)
  })

})