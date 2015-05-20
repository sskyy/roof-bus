import assert from "assert"
import Namespace from "../../src/namespace.js"

describe("string extend test", ()=>{

  it("string equal",()=>{
    var text = 'jason'
    var ns = new Namespace(text)
    assert.equal( ns == text, true)
  })

})