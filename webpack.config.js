var path = require('path')
var webpack = require("webpack")
module.exports = {
  entry : {
    compatible:  "./bus.compatible.js",
  },
  output : {
    path: path.join(__dirname,'./dist'),
    filename: "[name].js"
  },
  module: {
    loaders: [
      { test: /\.js?$/, exclude: /node_modules/, loader: "babel-loader"},
    ]
  },
  plugins : [
    new webpack.SourceMapDevToolPlugin({
      exclude: /node_modules/
    })
  ],
  resolve: {
    extensions: ['', '.js', '.json']
  },
  debug: true
}