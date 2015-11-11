# roof-bus

roof-bus is a event bus for both practical programmers and application architects. It can be used as a simple string-based event bus whitout any buy-in in small apps. When handling large apps, especially the one with complex business logic, its powerful features like Listener Sequence Control can help you keep the system low-coupled and flexsible during the growth.

## Quick Start

roof-bus is really easy to get start with, check the code below. I don't think it need any explaination.

```
var Bus = require('roof-bus')
var bus = new Bus

bus.on('start', function busListener( arg1, arg2 ){
	console.log('listener fired', arg1, arg2)
})

bus.fire('start', 'argument1', 'argument2')
```

Most event libraries use a simple first-in, first-out listener sequence. But sometimes simple tactic can not solve real-world problem. For example, framework usually load modules from file system in alphabetical order, but module's listener may require a diffrent registration order. Listener which control the access of certain functionality may require to be called first of the sequence. 

With roof-node, you can do it easily. Say that we have two listeners in different file both listen to event `start`, but one of them is in charge of validating the  arguments.

start-something.js:

```
module.exports = function(bus){
	bus.on('start', function( owner ){
		console.log(owner + 'started something')
	})
}
```

validate-arguments.js:

```
module.exports = function(bus){
	bus.on('start',{
		fn: function(owner){
			if(owner !== 'Jane') throw new Error('owner is not Jane')
		},
		first : true
	})
}
```

To put the validation listener to first place, simply change the listener to a object with attribute `first` that set to true. If you want to stop following listeners from being called, just throw a error. 

Sometime to describe complex business flow, listeners need to fire another event, like:

```
bus.on('process1', function(){
	bus.fire('process2')
})
```

When the hierachy goes deep, it will be hard to figure out what exactly happend when top event fired. Don't worry, roof-bus generates a detailed tracestack every time. And some visualization tools have already been developed.

```
图
```

Read on for more usage, you may find more practical features.


## Usage

### 1. Simple `on` and `fire`.


```
var Bus = require('roof-bus')
var bus = new Bus

bus.on('start', function busListener( arg1, arg2 ){
	console.log('listener fired', arg1, arg2)
})

bus.fire('start', 'argument1', 'argument2')
```

### 2. Listener Sequence Control

Order of listeners on the same event can be controlled. Just name you listener function and then use the function name in attribute `before` or `after`.

```
bus.on('start', function listener1( arg1, arg2 ){
	console.log('listener1 fired', arg1, arg2)
})

bus.on('start', {
	fn: function listener2( arg1, arg2 ){
		console.log('listener2 fired', arg1, arg2)
	},
	before : ['listener1']
})

bus.fire('start', 'argument1', 'argument2')
```

There are four order control attributes: `before` `after` `first` `last`. Check below.

```
bus.on('start', function listener1( arg1, arg2 ){
	console.log('listener1 fired', arg1, arg2)
})

bus.on('start', {
	fn: function listener2( arg1, arg2 ){
		console.log('listener2 fired', arg1, arg2)
	},
	before : ['listener1']
})

bus.on('start', {
	fn: function listener3( arg1, arg2 ){
		console.log('listener3 fired', arg1, arg2)
	},
	after : ['listener1']
})

bus.on('start', {
	fn: function listener4( arg1, arg2 ){
		console.log('listener4 fired', arg1, arg2)
	},
	first : true
})

bus.fire('start', 'argument1', 'argument2')
//fire order: 4 2 1 3
```

### 3. Handle asynchronicity

`fire` method always return a promise. If you have synchronous code in listener and want roof-bus wait for you, return a promise.

```
bus.on('start', function listener1( arg1, arg2 ){
	return new Promise(function(resolve,reject){
		setTimeout(resolve, 1000)
	})
})


bus.fire('start', 'argument1', 'argument2').then(function(){
	console.log('show in 1 second')
})
```

**Note** that listeners are fired synchronously as default. So listener which returns promise will block followers until promise resolve.

```
bus.on('start', function listener1( arg1, arg2 ){
	return new Promise(function(resolve,reject){
		setTimeout(resolve, 1000)
	})
})

bus.on('start', {
	fn: function listener2( arg1, arg2 ){
		console.log('will wait for listener1 resolve')
	},
	after : ['listener1']
})


bus.fire('start', 'argument1', 'argument2').then(function(){
	console.log('will wait all listener fired')
})

```

If you want some listeners to execute asynchronously, you can set `async` attribute to `true` as below. 


```
bus.on('start', {
	fn: function listener1( arg1, arg2 ){
		return new Promise(function(resolve,reject){
			setTimeout(resolve, 1000)
		})
	},
	async : true
})

bus.on('start', {
	fn: function listener2( arg1, arg2 ){
		console.log('will not be blocked by listener1')
	},
	after : ['listener1']
})



bus.fire('start', 'argument1', 'argument2').then(function(){
	console.log('show in 1 second')
})
```

### 4. Passing data between listeners

Note the order of listeners is important when passing data.

```
bus.on('start', function listener1( arg1, arg2 ){
	this.data.set('name','Bill')
})

bus.on('start', {
	fn: function listener2( arg1, arg2 ){
		console.log(this.data.get('name'))     // 'Bill'
	},
	after : 'listener1'
})
```

### 5. Error handling

You can throw a build-in Error instance or use roof-bus `error` method.

```
bus.on('start', function listener1( arg1, arg2 ){
	throw new Error('some error')
	//or 
	//return this.error(500,{msg:'some error'})
})

bus.fire('start').then(function(){

}).catch(function( error){
	console.log( error)
})

```

## Advanced

### list listeners

### listener tracestack