import Data from  "../../src/data.js"
import assert from "assert"


describe("data", ()=>{
  var data

  beforeEach(()=>{
    data = new Data
  })

  it("set and get from current",()=>{
    var testData = {
      "name" : "json",
      "person.age" : "21",
      "person.gender" : "male"
    }


    for( let key in testData){
      data.set(key, testData[key])
    }

    for( let key in testData) {
      assert.equal( testData[key], data.get(key))
    }
  })

  it("set and get from child",()=>{
    var childData = data.child()

    var testData = {
      "name" : "json",
      "person.age" : "21",
      "person.gender" : "male"
    }


    for( let key in testData){
      childData.set(key, testData[key])
    }

    for( let key in testData) {
      assert.equal( testData[key], childData.get(key))
    }
  })

  it("set and get global data",()=>{
    var childData = data.child()

    var testData = {
      "name" : "json",
      "person.age" : "21",
      "person.gender" : "male"
    }


    for( let key in testData){
      childData.global.set(key, testData[key])
    }

    for( let key in testData) {
      assert.equal( testData[key], childData.global.get(key))
      assert.equal( testData[key], data.global.get(key))
      assert.equal( testData[key], data.get(key))
    }
  })
})
