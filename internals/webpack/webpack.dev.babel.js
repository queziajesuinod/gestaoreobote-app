/**
 * DEVELOPMENT WEBPACK CONFIGURATION
 */

const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const baseConfig = require('./webpack.base.babel');

module.exports = baseConfig({
  mode: 'development',
  entry: [
    path.join(process.cwd(), 'app/app.js'),
  ],
  output: {
    filename: '[name].js',
    chunkFilename: '[name].chunk.js',
  },
  plugins: [
    new webpack.HotModuleReplacementPlugin(),
    new HtmlWebpackPlugin({
      template: 'app/index.html',
      inject: true,
    }),
  ],
  devtool: 'eval-source-map',
  performance: {
    hints: false,
  },
  devServer: {
    static: {
      directory: path.join(__dirname, '../../public'),
    },
    compress: true,
    hot: true,
    port: 3003,
    historyApiFallback: true,
    client: {
      overlay: true,
      progress: true,
    },
    headers: {
      'Access-Control-Allow-Origin': '*',
    },
  },
});
