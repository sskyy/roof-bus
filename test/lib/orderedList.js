import assert from "assert"
import OrderedList from  "../../src/orderedList.js"
import _ from "lodash"

describe("orderedList test", ()=>{
  var list
  var data
  var prefix = "item"
  beforeEach(()=>{
    list = new OrderedList
    data = (new Array(10)).fill(1).map((v,i)=>{
      var name = `${prefix}${i}`
      return [name,{name:name}]
    })

  })

  it("order first",()=>{
    var firstIndex = 3
    data[firstIndex].push({first:true})

    data.forEach(function(item){
      list.insert(...item)
    })


    var rawData = list.toArray()
    assert.equal( rawData[0].name , `${prefix}${firstIndex}` )
    assert.equal( rawData.length, data.length )
    assert.equal( list._waitList.size, 0 )
    assert.equal( list._list.size, data.length )
  })

  it("order last",()=>{
    var index = 3
    data[index].push({last:true})

    data.forEach(function(item){
      list.insert(...item)
    })

    var rawData = list.toArray()
    assert.equal( rawData[rawData.length-1].name , `${prefix}${index}` )
    assert.equal( rawData.length, data.length )
    assert.equal( list._waitList.size, 0 )
    assert.equal( list._list.size, data.length )
  })

  it("order before",()=>{
    var index = 3
    data[index].push({before:[`${prefix}${index-1}`]})

    data.forEach(function(item){
      list.insert(...item)
    })

    var rawData = list.toArray()
    assert.equal( rawData[index].name , `${prefix}${index-1}` )
    assert.equal( rawData[index-1].name , `${prefix}${index}` )
    assert.equal( rawData.length, data.length )
    assert.equal( list._waitList.size, 0 )
    assert.equal( list._list.size, data.length )

  })

  it("order after",()=>{
    var index = 3
    data[index].push({after:[`${prefix}${index+1}`]})

    data.forEach(function(item){
      list.insert(...item)
    })

    var rawData = list.toArray()

    assert.equal( rawData[index].name , `${prefix}${index+1}` )
    assert.equal( rawData[index+1].name , `${prefix}${index}` )
    assert.equal( rawData.length, data.length )
    assert.equal( list._waitList.size, 0 )
    assert.equal( list._list.size, data.length )
  })

  it("order complex",()=>{
    var beforeIndex = 4
    var beforeWhichIndex = 2
    var firstIndex = 6
    data[beforeIndex].push({before:[`${prefix}${beforeWhichIndex}`]})
    data[firstIndex].push({first:true})

    data.forEach(function(item){
      list.insert(...item)
    })

    var rawData = list.toArray()
    assert.equal( rawData[0].name , `${prefix}${firstIndex}` )

    var sortedBeforeWhichIndex = _.findIndex(rawData,{name:`${prefix}${beforeWhichIndex}`})
    assert.equal( rawData[sortedBeforeWhichIndex-1].name , `${prefix}${beforeIndex}` )
    assert.equal( rawData.length, data.length )
    assert.equal( list._waitList.size, 0 )
    assert.equal( list._list.size, data.length )
  })

  it("forEachAsync error with Promise",(done)=>{
    data.forEach(function(item){
      list.insert(...item)
    })

    var error = new Error("none")
    var i = 0

    var promise = new Promise((resolve,reject)=>{
      console.log("forEachAsync begin")
      list.forEachAsync(( value, next )=>{
        i++
        console.log( i)
        if( i==3 ){
          throw  error
        }
        next()
      },function allDone(error){
        console.log("throwing out error",i)
        if( error ) throw error
      })
    })

    promise.catch(err=>{
      assert.equal(err, error )
      assert.equal(i, 3)
      done()
    })

  })
})