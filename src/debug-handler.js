import BusError from "./error.js"

function redConsole( format, ...args){
    console.log("%c"+format, "color:red", ...args)
}

function redDuckTypeConsole( tag, arg){
    if( typeof  arg== "object"){
        redConsole("%s : %O",tag,arg)
    }else{
        redConsole("%s : ", tag, arg)
    }
}

var handlers = {
    error : {
        error : function busErrorHandler(...args){
            if( console.group ){
                //浏览器端
                console.group("This is Roof dev message:")

                args.forEach((arg)=>{
                    if( arg instanceof  BusError){
                        console.group("Roof-Bus error")
                        redConsole("code : %d", arg.code)
                        redDuckTypeConsole( "data", arg.data)
                        redDuckTypeConsole( "origin", arg.origin)
                        redConsole("stack : %s",arg.stack.join("\n"))

                        console.groupEnd()
                    }else{
                        console.error.call(console, arg)
                    }
                })

                console.groupEnd()
            }else{
                return console.error.call(console, ...args)
            }
        }
    }
}


export default handlers