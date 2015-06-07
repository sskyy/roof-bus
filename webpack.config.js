var webpack = require("webpack")
module.exports = {
  entry : {
    index:  "./src/index.js",
  },
  output : {
    path: __dirname,
    filename: "[name].js"
  },
  module: {
    loaders: [
      { test: /\.jsx?$/, exclude: /node_modules/, loaders: ["babel-loader"]},
      { test:/.less$/, loader : "style!css!less"},
      { test:/.json/, loader : "file-loader"},
      {test: /\.svg$/,loader: 'file-loader'}
    ]
  },
  plugins : [
    new webpack.SourceMapDevToolPlugin({
      exclude: /node_modules/
    })
  ]
}