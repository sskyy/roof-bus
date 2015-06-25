import util from "./util.js"
import Namespace from "./namespace.js"
import Tree from "./tree.js"
import OrderedList from "./orderedList.js"
import {Runtime, Facade} from "./runtime.js"
import Data from "./data.js"
import BusError from "./error.js"
import Debug from "./debug.js"
import debugHandler from "./debug-handler.js"



//由环境变量决定debug level
var debug = new Debug( null, debugHandler)

export default class Bus{
  constructor(options={defaultModule:"_system"}){
    this.options = options

    this._mute = new Map
    this._disable = new Map
    this._eventListenerMap = new Map
    this._rexEventListenerMap = new Map

    //注册时用的
    this._module = new Namespace
    this._blockForWaiting = new Set
    this._anonymousIndex = 0
    //

    //凡属要和父bus发生关连的数据都放在runtime里面
    //runtime对象会贯穿整个bus的fire过程
    this._runtime = new Runtime({
      stack : [],
      mute : new Facade(Map),
      data : new Facade(Data),
      results : new Facade(Tree),
      errors : []
    })

  }
  on( eventName, originListener ){
    var listener = this.normalizeListener(eventName,originListener)
    this.insertListener( listener )
    //this.buildListenerStack(eventName, listener)
    //mute 永远是指的mute某个事件的后代中的事件
    listener.mute && this.muteEvents( listener.mute, "listener", listener.indexName, eventName )
    listener.disable && this.disableListeners(  listener.disable,eventName,listener )
  }
  off( listener, event ){

  }
  anonymousName(){
    return `anonymous_${this._anonymousIndex++}`
  }
  insertListener( listener ){
    if( !util.isString(listener.event) && !util.isRegExp(listener.event) ){
      throw new Error("unknown event name type: "+listener.event)
    }

    var map = util.isString(listener.event) ? this._eventListenerMap : this._rexEventListenerMap
    var order = util.pick(listener, ['before','after','first','last'])
    var listenerArg = [listener.indexName, listener, order ]

    if( !map.get(listener.event.toString()) ){
      map.set(listener.event.toString(), new OrderedList)
    }

    var listenerList =  map.get(listener.event.toString())

    //调整 waitFor 和 blockFor 的顺序，将所有blockFor都转换成其他人的waitFor
    if( listener.blockFor ){

      for( let listenerToBlock of listener.blockFor ){
        if( listenerList.get(listenerToBlock) ){
          //要block的对象已经存在,那就给他增加个waitFor
          util.ensureSet( listenerList.get(listenerToBlock),"waitFor" ,listener.indexName)
        }else{
          //否则加到一个等待列表里
          util.ensureSet( this._blockForWaiting, listenerToBlock, listener.indexName)
        }
      }
    }

    //如果有监听器要block现在的监听器
    if( this._blockForWaiting[listener.indexName] ){
      util.ensureSet( listener, "waitFor", this._blockForWaiting[listener.indexName])
      this._blockForWaiting.delete(listener.indexName)
    }
    //doneTODO 待验证

    map.set(listener.event.toString(),listenerList.insert(...listenerArg))


    return this
  }
  getListenersFor(event){
    var map = util.isString(event) ? this._eventListenerMap : this._rexEventListenerMap
    return map.get(event)
  }
  muteEvents( muteEventNames, type, source, inEventName ){
    var muteEventNames = [].concat(muteEventNames)

    if( !this._mute.get(inEventName)){
      this._mute.set(inEventName, new Map)
    }

    var inEventMuteMap = this._mute.get(inEventName)

    muteEventNames.forEach( muteEventName =>{
      if( !inEventMuteMap.get(muteEventName)){
        inEventMuteMap.set(muteEventName, new MuteRecord)
      }

      inEventMuteMap.get(muteEventName).add({target:muteEventName,source:source,type:type,event:inEventName})
    })

  }
  disableListeners( listenerNames, fireEventName,listener ){
    listenerNames = [].concat(listenerNames)
    if( !this._disable.get(fireEventName) ){
      this._disable.set(fireEventName, new Map)
    }

    var disableMap = this._disable.get(fireEventName)
    listenerNames.forEach( listenerName =>{
      if( !disableMap.get(listenerName) ){
        disableMap.set(listenerName,new Set)
      }
      disableMap.get(listenerName).add({target:listenerName,source:listener.indexName,type:"listener"})
    })
  }
  fire( eventName, ...data ){
    //fire前需要清空上一次的 runtime 数据(数据树 结果树 调用栈)
    this._runtime.reset()
    var event  = this.normalizeEvent(eventName)
    var listeners =  this.findListenersForEvent( event.name )

    //处理数据
    this._runtime.data = this._runtime.data.child()

    //因为触发的事件可以重名，所以需要用记录stackIndex，
    //确保后续listener的信息能放入正确的stack对象中。
    var eventStack = this.makeEventStack( event, listeners)
    this._runtime.stack.push( eventStack )
    event._stackIndex = eventStack.index


    //根据触发条件{mute,disable,target}，依次触发监听器,如果监听器有 waitFor 选项，则将其加入到 waitFor 对象的 promise 中

    //获取监听器返回值
    // 如果返回非 bus.signal, 则继续执行。
    // 如果返回 bus.signal包装过的结果，如果结果是 promise，并且blockFor为all，则暂停遍历。
    // 如果没有结果或者是普通结果， signal{mute,disable,blockFor}, 则动态改变后面的触发条件

    // 如果返回 error, 则立即跳出整个 触发栈
    // 如果返回的是普通的对象，则构建结果树(不是数据树！)

    // 冲突情况: 异步的 waitFor 中返回的结果无法 block 任何
    return this.fireListeners( event, listeners, data )

  }
  normalizeEvent( rawEvent ){

    var fireEvent = util.isString(rawEvent) ? {name : rawEvent} : rawEvent
    fireEvent.muteBy = this.getMuteFor( fireEvent.name )
    if( !fireEvent.muteBy ){
      //mute 记录的是后代的事件禁用情况！muteBy记录的时当前的情况
      ["mute","disable","target"].forEach((key)=>{
        if(fireEvent[key]) fireEvent[key] = [].concat(fireEvent[key])
      })


      if( this._mute.get(fireEvent.name) ){
        //如果有listener在此事件中需要禁用后代中的事件
        for( let muteEventRecords of this._mute.get(fireEvent.name).values()  ){
          this.storeRuntimeMute( muteEventRecords.toArray() )
        }
      }
      if( fireEvent.mute ){
        fireEvent.mute = [].concat(fireEvent.mute).map((muteName)=>{
          return {target:muteName,source:fireEvent.name,type:"fire"}
        })
      }
      //如果在触发时要禁用后代中的事件
      fireEvent.mute && this.storeRuntimeMute( fireEvent.mute)


      //如果触发时要禁用监听器
      if( fireEvent.disable ){
        fireEvent.disable = new Map([].concat(fireEvent.disable).map(targetName=>{
          return [targetName, new Set([{target:targetName,source:fireEvent.name,type:"fire"}])]
        }))
      }
      //如果注册时要禁用监听器
      if( this._disable.get(fireEvent.name) ){
        if( !fireEvent.disable ) fireEvent.disable = new Map
        for( let [targetName,sources] of this._disable.get(fireEvent.name)){
          if( !fireEvent.disable.get(targetName)){
            fireEvent.disable.set(targetName, new Set)
          }
          for( let source of sources){
            fireEvent.disable.get(targetName).add(source)
          }
        }
      }

      if( fireEvent.target ){
        fireEvent.target = new Set([].concat(fireEvent.target))
      }
    }

    /*
    {
      eventName
      muteBy Array
      mute Array
      Map {disabledListenerName : Set sources }disable
      Set target
    }
     */
    return fireEvent
  }
  getMuteFor( eventName){
    //永远是从runtime中获取是否被mute了，因为mute永远是对子孙起作用，
    //而子孙是通过runtime传递的
    if( !this._runtime.mute.get(eventName) ) return

    var mute = new MuteRecord
    if( this._runtime.mute.get(eventName) ){
      //继承祖先事件的mute信息
      mute.concat( this._runtime.mute.get(eventName) )
    }

    return mute
  }
  storeRuntimeMute( muteObjects ){
    //三种mute触发来源，需要利用runtime来获取祖先mute信息
    /*
     1. 注册事件时的listener带的mute
     2. 当前事件触发时带的mute信息 (snapshot) 当前并不会执行任何操作
     3. 祖先事件触发时带的mute信息 (snapshot)
     */
    //始终返回一个新的 mute record 对象

    muteObjects.forEach((mute)=>{
      if( !this._runtime.mute.get(mute.target) ){
        this._runtime.mute.set(mute.target,new MuteRecord())
      }

      this._runtime.mute.get(mute.target).add(mute)
    })

  }

  findListenersForEvent( eventName ){
    // 找到所有匹配的event，字符串和正则
    var listeners = this._eventListenerMap.get( eventName ) ? this._eventListenerMap.get( eventName ).clone() : new OrderedList


    //获取所有匹配到的监听器，并且将正则监听器重新与字符串监听器排序
    for( let [rex,rexEventListener] of this._rexEventListenerMap ){
      if( (new RegExp(rex)).test(eventName) ){
        let order = util.pick(rexEventListener, ['before','after','first','last'])
        let listenerArg = [rexEventListener.indexName, util.clone(rexEventListener ), order ]
        listeners.insert( ...listenerArg )
      }
    }

    return listeners
  }
  fireListeners( event, listeners, data ){
    //依次触发，通过 snapshot 连接 traceStack, runtime

    //对错误的处理问题参见:https://docs.google.com/document/d/1UW9Lci7KpvPNXLG7n5v_SIEQQOQzIwtHIos44Fl020s/edit?usp=sharing

    //debug.log("fire======",event.name,"listeners:")
    //debug.log( event.disable,[...this._disable.get(event.name).keys()])

    var firePromise = new Promise((resolve,reject)=>{
      if( event.muteBy ){
        return setTimeout(resolve, 1)
      }

      //OrderedList 已经禁止了重名，所以一个event下的listener是不会重名的
      //只记录当前监听器循环中的执行阶段的错误
      //异步阶段的错误在 result 中返回，除非开发者没有return相应的promise
      var results = {}


      listeners.forEachAsync((listener, next)=> {
        //target 和 disable 可以共存
        if( event.target && !event.target.has(listener.indexName) ) return next()
        if( event.disable && event.disable.get(listener.indexName) ) return next()


        var snapshot = this.snapshot(event, listener)
        //处理监听器的 waitFor

        var result
        if( listener.waitFor){
          //debug.log("calling listener",listener.indexName, listener.waitFor)
          //如果waitFor的监听器返回的是promise，那么就等其resolve,

          let promiseToWait = [...listener.waitFor].reduce((list,waitForName)=>{
            if( results[waitForName].data instanceof Promise){
              list.push( results[waitForName].data )
            }else{
              debug.warn(waitForName,"result is not a promise",results[waitForName])
            }
            return list
          },[])

          debug.log(listener.indexName,"must wait for", listener.waitFor, promiseToWait.length)
          //并且把自己的结果也包装成Promise，这样可以继续让其他监听器waitFor
          result = this.parseResult( Promise.all(promiseToWait).then(()=>{
            return listener.fn.call(snapshot, ...data)
            //这里只能在stackTrace里面做记录，因为promise已经是执行的第二阶段了。
            //throw err 没有用。
          //}).catch(err=>{
          //  throw err
          }))

        }else{
          //debug.log("calling none waitFor listener",listener.indexName, listener.waitFor)
          try{
            result = this.parseResult( listener.fn.call(snapshot, ...data) )
          }catch(e){
            //任何执行时的错误，可以打断当前的监听器执行循环，并使当前promise reject
            //错误也扔到 results中，之后用来收集到 stack里
            let error = new BusError(500,e)
            results[listener.indexName] = this.parseResult( error, {})
            return next(error)
          }

          if( result.data instanceof BusError ){
            results[listener.indexName] = result
            return next(result.data)
          }
        }

        //如果返回 BusError，则也认为是执行期错误。


        //暂存一下，后面的waitFor需要用
        results[listener.indexName] = result

        //debug.log( `result of ${listener.indexName}`,result,result instanceof BusResult )

        //动态处理mute
        if( result.signal.mute ){
          //这里一定要把 mute 放到当前的runtime里面，而不是snapshot。
          //动态mute一定要和order一起使用，应为动态的mute只对后续触发的listener中的子孙事件有效。
          this.storeRuntimeMute([].concat(result.signal.mute).map((muteName)=>{
            return {target:muteName,source:listener.indexName,type:"call"}
          }))
        }

        //动态处理disable
        if( result.signal.disable !== undefined ){
          if( !event.disable ) event.disable = new Map
          let disableNames = [].concat(result.signal.disable)
          disableNames.forEach((disableName)=>{
            if( !event.disable.get(disableName) ) event.disable.set(disableName, new Set)
            event.disable.get(disableName).add({target:disableName,source:listener.indexName,type:"call"})
          })
        }

         //动态处理blockFor
        if( result.signal.blockFor ){
          [].concat(result.signal.blockFor).forEach(blockForName=>{
            //debug.log("blocking",blockForName)
            var listenerToBlock = listeners.get(blockForName)
            if( listenerToBlock ){
              if( !listenerToBlock.waitFor ) listenerToBlock.waitFor = new Set
              listenerToBlock.waitFor.add( listener.indexName )
              //debug.log("listener to block updated", listenerToBlock, [...listenerToBlock.waitFor])
            }else{
              console.warn("listener not called in this event", blockForName)
            }
          })
        }

        //处理snapshot的destroy
        if( result.data && result.data instanceof  Promise){
          result.data.then(()=>{
            snapshot.destroy()
          }).catch(function(e){
            snapshot.destroy()
            throw e
          })
        }else{
          snapshot.destroy()
        }

        next()
      }, function allDone(err) {
        //debug.log("fire done",event.name)
        if( err ){
          if( !(err instanceof BusError)){
            err = new BusError(500, err)
          }
        }

        //都执行完之后，
        for( let listenerIndexName in results ){
          this._runtime.stack[event._stackIndex].listeners[listenerIndexName].result = results[listenerIndexName]
        }

        //任何执行期的错误，打断当前循环，并且使promise reject
        if(err){
          debug.error( err )
          return reject( err )
        }

        //当所有监听器的第二阶段也执行完之后，再决定当前的promise是resolve还是reject
        Promise.all( util.values(results).map(result=>{return result.data}) ).then(resolve).catch(reject)
      }.bind(this))
    })

    //提供默认的this指针
    this.bindThisToResolver(firePromise)

    return firePromise
  }
  bindThisToResolver(promise){
    var _then = promise.then
    promise.then = (...args)=>{
      args = args.map( arg => { return arg.bind(this)})
      return _then.call( promise, ...args)
    }
    return promise
  }
  parseResult( result ){
    if( result instanceof BusResult ) return result

    return this.result(result,{})
  }
  snapshot(event, listener){
    var snapshot = {_isSnapshot:true}
    util.extend(snapshot, util.clone(this))

    snapshot.__proto__ = this.__proto__

    var liftedMuteClone = new Map([...this._runtime.mute].map(([k,v])=>{
       v.clone().lift()
      return [k,v]
    }))


    //对当前的listener创建一个新的stack，用来记录其中触发的event
    //debug.log( Object.keys(this._runtime.stack[event._stackIndex].listeners), listener.indexName)
    //debug.log(listener.indexName, this._runtime.stack[event._stackIndex].listeners[listener.indexName])
    this._runtime.stack[event._stackIndex].listeners[listener.indexName].stack = []

    //注意 snapshot 时是不用调用data.child()的，因为同级snapshot共享数据
    snapshot._runtime = {
      reset : function noop(){},
      mute : liftedMuteClone,
      data : this._runtime.data,
      stack : this._runtime.stack[event._stackIndex].listeners[listener.indexName].stack,
    }

    snapshot.destroy = function(){
      this._isDestoryed = true
      for( var i in this){
        delete this[i]
      }
      this.__proto__ = null
    }

    return snapshot
  }
  get data(){
    return this._runtime.data
  }
  fcall( event, listener ){
    //TODO
  }
  then( fn ){
    //TODO 当前对象中没有正在触发的监听器
  }
  catch( fn ){
    //TODO 当前对象中有触发器，并触发了错误
  }
  result( data, signal={} ){
    if( arguments.length ==1 ){
      signal = data
      data = undefined
    }
    return new BusResult( data, signal)
  }
  error( code, data ){
    return new BusError( code, data)
  }
  getRegisteredEvents(){
    //TODO
  }
  makeEventStack(event, listenersOrderedList ){
    var eventStack = {}
    eventStack.event = util.cloneDeep(event)
    eventStack.$class = "event"

    var clonedListenerArray =  util.cloneDeep(listenersOrderedList.toArray(), (item)=>{
      if( item instanceof Set ){
        return [...item]
      }else if( item instanceof Map){
        return util.zipObject( [...item.keys()],[...item.values()])
      }else if( item instanceof Function){
        return `[Function ${item.name}]`
      }
    }).map(( listener)=>{
        listener.$class = 'listener'
        return listener
    })

    eventStack.listeners = util.zipObject( clonedListenerArray.map(listener=>{
      return listener.indexName
    }), clonedListenerArray)

    eventStack.index = this._runtime.stack.length
    return eventStack
  }
  normalizeListener(eventName, listener){
    listener = util.isFunction(listener) ? { fn : listener} : listener
    listener.event = eventName

    //change plain string to Namespace object
    if( !listener.module ){
      listener.module = this._module.clone()
    }else{
      if( listener.module !== this._module.toString() ){
        listener.vendor = this._module.clone()
      }else{
        listener.module = new Namespace(listener.module)
      }
    }

    if( listener.before ){
      listener.before = new Set([].concat(listener.before))
    }

    if( listener.after ){
      listener.after = new Set([].concat(listener.after))
    }

    if( listener.blockFor ){
      listener.blockFor = new Set( [].concat( listener.blockFor))

      if( !listener.before ) listener.before = new Set
      for( let blockForName of listener.blockFor ){
        listener.before.add(blockForName)
      }
    }

    if( listener.waitFor ){
      listener.waitFor = new Set( [].concat( listener.waitFor))

      if( !listener.after ) listener.after = new Set
      for( let waitForName of listener.waitFor ){
        listener.after.add(waitForName)
      }
    }

    if( !listener.name ){
      listener.name = listener.fn.name || this.anonymousName()
    }

    listener.indexName  = listener.module.toString() ? `${listener.module.toString()}.${listener.name}` : listener.name

    return listener
  }
}

class BusResult{
  constructor( data, signal){
    this.$class = (data===null || data===undefined) ? data : data.constructor.name
    this.data = data
    this.signal = signal
  }
}



class MuteRecord{
  constructor( mutes=[] ){
    this._mutes = mutes
  }
  add(mute){
    this._mutes.push( mute )
  }
  concat(mutes){
    if( mutes instanceof  MuteRecord){
      this._mutes = this._mutes.concat( mutes._mutes )
    }else{
      this._mutes = this._mutes.concat( mutes)
    }
  }
  clone( cloneFn){
    return new MuteRecord( util.cloneDeep( this._mutes), cloneFn )
  }
  lift(){
    this._mutes.forEach((mute)=>{
      mute.lifted = mute.lifted === undefined ? 1 : mute.lifted+1
    })
  }
  toArray(){
    return util.cloneDeep(this._mutes)
  }
}


