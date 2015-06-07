var webpack = require('webpack');
var WebpackDevServer = require('webpack-dev-server');
var path = require("path")

new WebpackDevServer(webpack({
    entry : {
        profile : "./profile/browser/index.js",
        promise : "./profile/browser/index-promise.js"
    },
    output : {
        path: path.join(__dirname,"profile/browser"),
        filename: "[name].js"
    },
    module: {
        loaders: [
            { test: /\.jsx?$/, exclude: /node_modules/, loaders: ["babel-loader"]},
        ]
    },
    plugins : [
        new webpack.SourceMapDevToolPlugin({
            exclude: /node_modules/
        })
    ]
}), {

}).listen(9000, 'localhost', function (err, result) {
    if (err) {
      console.log(err);
    }

    console.log('Listening at localhost:9000');
  });
