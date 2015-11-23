var  assert = require("assert")
var  OrderedList = require("../../../lib/OrderedList.js")

function fill( array, value ){
  //value 为 undefined 时, 数组 map 会跳过
  if( value === undefined ) value = 1
  for( var i=0; i< array.length; i++ ){
    array[i] = value
  }
  return array
}

function findIndex( array, where){
  var index = -1
  for( var i in array ){
    var allMatch = true
    for( var key in where ){
      if( where[key] !== array[i][key]){
        allMatch = false
        break
      }
    }
    if( allMatch ){
      index = i
      break
    }
  }
  return index
}

describe("orderedList test", function(){
  var list
  var data
  var prefix = "item"
  beforeEach(function(){
    list = new OrderedList
    data = fill(new Array(10), 1).map(function(v,i){
      var name = `${prefix}${i}`
      return [name,{name:name}]
    })

  })

  it("order first",function(){
    var firstIndex = 3
    data[firstIndex].push({first:true})

    data.forEach(function(item){
      list.insert.apply(list, item)
    })


    var rawData = list.toArray()
    assert.equal( rawData[0].name , `${prefix}${firstIndex}` )
    assert.equal( rawData.length, data.length )
    assert.equal( list._waitList.size, 0 )
    assert.equal( list._list.size, data.length )
  })

  it("order last",function(){
    var index = 3
    data[index].push({last:true})

    data.forEach(function(item){
      list.insert.apply(list, item)
    })

    var rawData = list.toArray()
    assert.equal( rawData[rawData.length-1].name , `${prefix}${index}` )
    assert.equal( rawData.length, data.length )
    assert.equal( list._waitList.size, 0 )
    assert.equal( list._list.size, data.length )
  })

  it("order before",function(){
    var index = 3
    data[index].push({before:[`${prefix}${index-1}`]})

    data.forEach(function(item){
      list.insert.apply(list, item)
    })

    var rawData = list.toArray()
    assert.equal( rawData[index].name , `${prefix}${index-1}` )
    assert.equal( rawData[index-1].name , `${prefix}${index}` )
    assert.equal( rawData.length, data.length )
    assert.equal( list._waitList.size, 0 )
    assert.equal( list._list.size, data.length )

  })

  it("order after",function(){
    var index = 3
    data[index].push({after:[`${prefix}${index+1}`]})

    data.forEach(function(item){
      list.insert.apply(list,item)
    })

    var rawData = list.toArray()

    assert.equal( rawData[index].name , `${prefix}${index+1}` )
    assert.equal( rawData[index+1].name , `${prefix}${index}` )
    assert.equal( rawData.length, data.length )
    assert.equal( list._waitList.size, 0 )
    assert.equal( list._list.size, data.length )
  })

  it("order complex",function(){
    var beforeIndex = 4
    var beforeWhichIndex = 2
    var firstIndex = 6
    data[beforeIndex].push({before:[`${prefix}${beforeWhichIndex}`]})
    data[firstIndex].push({first:true})

    data.forEach(function(item){
      list.insert.apply(list, item)
    })

    var rawData = list.toArray()
    assert.equal( rawData[0].name , `${prefix}${firstIndex}` )

    var sortedBeforeWhichIndex = findIndex(rawData,{name:`${prefix}${beforeWhichIndex}`})
    assert.equal( rawData[sortedBeforeWhichIndex-1].name , `${prefix}${beforeIndex}` )
    assert.equal( rawData.length, data.length )
    assert.equal( list._waitList.size, 0 )
    assert.equal( list._list.size, data.length )
  })

  it("forEachAsync error with Promise",function(done){
    data.forEach(function(item){
      list.insert.apply(list, item)
    })

    var error = new Error("none")
    var i = 0

    var promise = new Promise(function(resolve, reject){
      console.log("forEachAsync begin")
      list.forEachAsync(function(value, next){
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

    promise.catch(function(err){
      assert.equal(err, error )
      assert.equal(i, 3)
      done()
    })

  })
})