'use strict'

var  Data =require("../../../lib/data.js")
var assert = require("assert")


describe("data", function(){
  var data

  beforeEach(function(){
    data = new Data
  })

  it("set and get from current", function(){
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

  it("set and get from child",function(){
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

  it("set and get global data",function(){
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
      assert.notEqual( testData[key], data.get(key))
    }
  })
})
