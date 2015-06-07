//TODO 增加环境变量判断level
//TODO 将node的handler和浏览器的handler完全分离

var _defaultHandlers = {
    debug : {
        debug : function(...arg){
            return console.log.call( console, ...arg)
        },
        log : function(...arg){
            return console.log.call( console, ...arg)
        }
    },
    info : {
        info : function(...arg){
            return console.info.call( console, ...arg)
        }
    },
    warn : {
        warn : function(...arg){
            return console.warn.call( console, ...arg)
        }
    },
    error : {
        error : function(...arg){
            return console.error.call( console, ...arg)
        }
    }
}


class Debug{
    constructor( level, handlers ){
        this.level = level || "debug"
        this.levelMap = {
            "debug" :0,
            "info" :1,
            "warn" :2,
            "error" :3,
        }

        var container = [_defaultHandlers, handlers]
        container.forEach(( c )=>{
            if( !c ) return

            for( var handlerLevel in c ){
                for( var handlerName in c[handlerLevel]){
                    this.register(handlerLevel, handlerName, c[handlerLevel][handlerName])
                }
            }
        })
    }
    register( level, name, handler ){
        if( this.levelMap[level] >= this.levelMap[this.level] ){
            this[name] = handler
        }
    }
}

export default Debug



