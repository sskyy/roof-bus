var Http = require('http')
var Bus = require('../index.js')
var fs = require('fs')
var bus  = new Bus

var moduleFiles =  fs.readdirSync('./modules')

moduleFiles.forEach(name=>{
  if( /^\./.test(name) ) return
  require('./modules/'+name)(bus)
})

function responseContent( response, content ){
  response.writeHead(200, {"Content-Type": "text/html"});
  response.write(`
<!DOCTYPE html>
<html>
  <head>
    <title>Hello World Page</title>
  </head>
  <body>
    <h1>
    ${content}
    </h1>
    <div>
      <p>This example shows how we can use a listener protect all entry.<p>
      <p>Add modules in directory module and restart server, see what happens.</p>
    </div>
  <div>
    <a href='/index'>navigate to index</a></div>
  <div>
    <a href='/dashboard'>navigate to dashboard</a><div>
  </div>
  </body>
</html>
  `)

  response.end();
}

var server = Http.createServer(function(request, response) {

  bus.fire('start', request.url).then(function(){
    responseContent(response, this.data.global.get('response'))
  }).catch(function(e){
    responseContent(response, e.data.msg)
  })
})

server.listen(3000, function(){
  console.log('server listening on http://127.0.0.1:3000')
})

