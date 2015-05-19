import assert from "assert"

describe("promise test", ()=>{
  return
  var result = "promise resolved"
  var p1 = new Promise(function(resolve, reject){
    setTimeout(function(){
      resolve(result)
    },100)
  })
  it( "instaceof", (done)=>{
    assert.equal( p1 instanceof Promise, true)
    p1.then(res=>{
      assert.equal( result, res)
      done()
    })
  })
})