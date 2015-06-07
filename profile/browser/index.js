import _ from "babel/polyfill.js"

import Bus from "../../src/index.js"


var bus = new Bus


bus.on("memory.leak.examine", function examineMemoryLeak( arg){
    this.fire("simulate.sub.listener.fire", arg).then(function allDone( ){
        console.log("nothing in resolve function body")
    })
})

bus.on("simulate.sub.listener.fire", function subListenerCalled(arg){
    if( arg ===1){
        return this.error({arg:arg})
    }
    console.log("sub listener called")
})

function fireLoop( left ){
    if( left ){
        console.log( left)
        bus.fire("memory.leak.examine", left).then(function(){
            window.setTimeout(function(){
                fireLoop( left -1)
            }, 100)
        })
    }else{
        throw new Error("origin error")
    }
}

window.fireLoop = fireLoop



