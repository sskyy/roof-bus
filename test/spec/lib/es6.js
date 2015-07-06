import assert from "assert"

describe("promise test", ()=>{
  //return
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

  it("error",(done)=>{
    var error = new Error("aaaa")
    new Promise((resolve,reject)=>{
        throw error
      }).catch(e=>{
        assert.equal(e, error)
      done()
    })

    //done("should not done here")
  })

  it("error reject",(done)=>{
    var error = new Error("aaaa")
    var promise = new Promise((resolve,reject)=>{
      reject( error)
    })

    promise.catch(e=>{
      assert.equal(e, error)
      done()
    })
  })

  it("Map order",()=>{
    var map = new Map
    var items = [3,1,2,"c","a","b"]

    items.forEach((item)=>{
      map.set(item.toString(),item)
    })

    assert.equal( [...map.keys()].join(""), items.map(item=>{return item.toString()}).join("") )
    assert.equal( [...map.values()].join(""), items.map(item=>{return item.toString()}).join("") )
  })

  it("Promise values",()=>{
    var data = {name:"jason"}
    var promise = new Promise((resolve,reject)=>{
      resolve(data)
    })

    promise.then((resolvedData)=>{
      assert.equal( resolvedData, data)
      //Object.assign(promise,data)
      console.log( promise)
    })

  })
})