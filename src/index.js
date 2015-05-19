import util from "./util.js"
import _ from "lodash"
import Namespace from "./namespace.js"
import Tree from "./tree.js"
import OrderedList from "./orderedList.js"
import {Runtime, Facade} from "./runtime.js"


import prettyjson from "prettyjson"
var print = function( obj ){
  console.log( prettyjson.render(obj))
}

class Bus{
  constructor(options={defaultModule:"_system"}){
    this.options = options

    //this._eventTree = new Tree
    this._mute = new Map
    this._disable = new Map
    this._eventListenerMap = new Map
    this._rexEventListenerMap = new Map

    //注册时用的
    this._module = new Namespace
    this._blockForWaiting = {}
    this._anonymousIndex = 0
    //

    //凡属要和父bus发生关连的数据都放在runtime里面
    //runtime对象会贯穿整个bus的fire过程
    this._runtime = new Runtime({
      traceStack : {events : []},
      mute : new Facade(Map),
      data : new Facade(Tree),
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
    if( !_.isString(listener.event) && !_.isRegExp(listener.event) ){
      throw new Error("unknown event name type: "+listener.event)
    }

    var map = _.isString(listener.event) ? this._eventListenerMap : this._rexEventListenerMap
    var order = _.pick(listener, ['before','after','first','last'])
    var listenerArg = [listener.indexName, listener, order ]

    if( !map.get(listener.event.toString()) ){
      map.set(listener.event.toString(), new OrderedList)
    }

    var listenerList =  map.get(listener.event.toString())

    //TODO 调整 waitFor 和 blockFor 的顺序，将所有blockFor都转换成waitFor
    if( listener.blockFor ){
      if( listenerList.has(listener.blockFor) ){
        util.ensureArray( listener, "before", listener.blockFor)
        //如果已经有waitFor了？
        util.ensureArray( listenerList.get(listener.blockFor),"waitFor" ,listener.indexName)
      }else{
        util.ensureArray( this._blockForWaiting, listener.blockFor, listener.indexName)
      }
    }

    if( this._blockForWaiting[listener.indexName] ){
      util.ensureArray( listener, "waitFor", this._blockForWaiting[listener.indexName])
      delete this._blockForWaiting[listener.indexName]
    }
    //doneTODO 待验证

    map.set(listener.event.toString(),listenerList.insert(...listenerArg))


    return this
  }
  getListenersFor(event){
    var map = _.isString(event) ? this._eventListenerMap : this._rexEventListenerMap
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
      console.log("adding disables",{target:listenerName,source:listener.indexName,type:"listener"},fireEventName)
      disableMap.get(listenerName).add({target:listenerName,source:listener.indexName,type:"listener"})
    })
  }
  fire( eventName, ...data ){
    //fire前需要清空上一次的 runtime 数据(数据树 结果树 调用栈)
    this._runtime.reset()

    var event  = this.normalizeEvent(eventName)
    var listeners = !event.muteBy && this.findListenersForEvent( event.name )


    return this.fireListeners(event, listeners )


    //TODO 根据触发条件{mute,disable,target}，依次触发监听器,如果监听器有 waitFor 选项，则将其加入到 waitFor 对象的 promise 中

      //TODO 获取监听器返回值
      // 如果返回非 bus.signal, 则继续执行。
      // 如果返回 bus.signal包装过的结果，如果结果是 promise，并且blockFor为all，则暂停遍历。
      // 如果没有结果或者是普通结果， signal{mute,disable,blockFor}, 则动态改变后面的触发条件

      // 如果返回 error, 则立即跳出整个 触发栈
      // 如果返回的是普通的对象，则构建结果树(不是数据树！)

      // 冲突情况: 异步的 waitFor 中返回的结果无法 block 任何
  }
  normalizeEvent( rawEvent ){


    //TODO 两种disable触发来源
    /*
    1. 注册时的listener带的disable
    2. 触发事件时带的disable
     */

    //TODO 两种target触发来源
    /*
    1. 注册时的target
    2. 触发时的target
     */

    var fireEvent = _.isString(rawEvent) ? {name : rawEvent} : rawEvent
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
        let order = _.pick(rexEventListener, ['before','after','first','last'])
        let listenerArg = [rexEventListener.indexName, _.clone(rexEventListener ), order ]
        listeners.insert( ...listenerArg )
      }
    }

    return listeners
  }
  fireListeners( event, listeners ){
    //TODO 依次触发，通过 snapshot 连接 traceStack, runtime
    console.log("fire======",event.name,"listeners:")
    //print( listeners.toArray())
    //console.log("muted by")
    //print( event.muteBy)
    //console.log("========")

    //console.log( event.disable,[...this._disable.get(event.name).keys()])

    return new Promise((resolve,reject)=>{
      if( !event.muteBy ) {
        listeners.forEachAsync((listener, next)=> {
          //target 和 disable 可以共存
          if( event.target && !event.target.has(listener.indexName) ) return next()
          if( event.disable && event.disable.get(listener.indexName) ) return next()

          var snapshot = this.snapshot()
          var result = listener.fn.call(snapshot)
          if( result instanceof BusResult ){
            //动态处理mute
            if( result.signal.mute ){
              snapshot.storeRuntimeMute([].concat(result.signal.mute).map((muteName)=>{
                return {target:muteName,source:listener.indexName,type:"call"}
              }))
            }

            //动态处理disable
            if( result.signal.disable ){
              let disableNames = [].concat(result.signal.disable)
              disableNames.forEach((disableName)=>{
                if( !event.disable.get(disableName) ) event.disable.set(disableName, new Set)
                event.disable.get(disableName).add({target:disableName,source:listener.indexName,type:"call"})
              })
            }

            //TODO 动态处理blockFor
          }

          next()
        }, function allDone() {
          setTimeout(resolve, 1)
        })
      }else{
        setTimeout(resolve, 1)
      }
    })
  }
  snapshot(){
    var snapshot = {}
    _.extend(snapshot, _.clone(this))

    snapshot.__proto__ = this.__proto__

    var muteClone = new Map([...this._runtime.mute].map(([k,v])=>{
       v.clone().lift()
      return [k,v]
    }))


    snapshot._runtime = {
      reset : ()=>{},
      mute : muteClone
      //TODO 搞定 traceStack
    }

    return snapshot
  }
  data( path, data){

  }
  fcall( event, listener ){

  }
  then( fn ){
    //当前对象中没有正在触发的监听器
  }
  catch( fn ){
    //当前对象中又触发器，并触发了错误
  }
  result( result, signal ){
    if( arguments.length ==1 ){
      [signal , result] = [result, undefined]
    }
    return new BusError( result, signal)
  }
  error( code, data ){
    return new BusError( code, data)
  }
  getRegisteredEvents(){

  }
  normalizeListener(eventName, listener){
    listener = _.isFunction(listener) ? { fn : listener} : listener
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

    if( !listener.name ){
      listener.name = listener.fn.name || this.anonymousName()
    }

    listener.indexName  = listener.module.toString() ? `${listener.module.toString()}.${listener.name}` : listener.name

    return listener
  }
}

class BusResult{
  constructor( result, signal){
    this.result = result
    this.signal = signal
  }
}

class BusError{
  constructor( code, error ){
    this.code = code
    this.error = error
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
    return new MuteRecord( _.cloneDeep( this._mutes), cloneFn )
  }
  lift(){
    this._mutes.forEach((mute)=>{
      mute.lifted = mute.lifted === undefined ? 1 : mute.lifted+1
    })
  }
  toArray(){
    return _.cloneDeep(this._mutes)
  }
}

export default Bus