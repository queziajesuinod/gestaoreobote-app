/**
 * COMMON WEBPACK CONFIGURATION
 */

const path = require('path');
const webpack = require('webpack');
const dotenv = require('dotenv'); // ✅ NOVO

// ✅ Carregar variáveis do .env
const env = dotenv.config().parsed || {};

// ✅ Filtrar apenas variáveis REACT_APP_*
const envKeys = Object.keys(env)
  .filter(key => key.startsWith('REACT_APP_'))
  .reduce((acc, key) => {
    acc[`process.env.${key}`] = JSON.stringify(env[key]);
    return acc;
  }, {});
// const ESLintPlugin = require('eslint-webpack-plugin');

module.exports = options => ({
  mode: options.mode,
  entry: options.entry,
  output: {
    // Compile into js/build.js
    path: path.resolve(process.cwd(), 'build'),
    publicPath: '/',
    ...options.output,
  }, // Merge with env dependent settings
  optimization: options.optimization,
  module: {
    rules: [
      {
        test: /\.jsx?$/, // Transform all .js and .jsx files required somewhere with Babel
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            cacheDirectory: true,
          },
        },
      },
      {
        test: /\.js$/,
        enforce: 'pre',
        use: ['source-map-loader'],
      },
      {
        // Preprocess our own .css files
        test: /\.css$/,
        exclude: /node_modules/,
        use: [
          { loader: 'style-loader' },
          {
            loader: 'css-loader',
            options: {
              esModule: false,
              sourceMap: false,
              importLoaders: 10,
              modules: false,
            },
          },
        ],
      },
      {
        // Preprocess 3rd party .css files located in node_modules
        test: /\.css$/,
        include: /node_modules/,
        use: [
          { loader: 'style-loader' },
          {
            loader: 'css-loader',
            options: {
              esModule: false,
              importLoaders: 10,
              modules: false,
            },
          },
        ],
      },
      {
        test: /\.(eot|otf|ttf|woff|woff2)$/,
        use: 'file-loader',
      },
      {
        test: /\.(scss)$/,
        use: [
          { loader: 'style-loader' },
          {
            loader: 'css-loader',
            options: {
              esModule: false,
              sourceMap: false,
              importLoaders: 10,
              modules: true,
            },
          },
          {
            loader: 'postcss-loader',
            options: { sourceMap: false },
          },
          {
            loader: 'sass-loader',
            options: {
              sassOptions: {
                outputStyle: 'expanded',
                sourceMap: false,
              },
            },
          },
        ],
      },
      {
        test: /\.md$/,
        use: 'raw-loader',
      },
      {
        test: /\.(jpg|png|gif|svg)$/,
        use: [
          {
            loader: 'url-loader',
            options: {
              // Inline files smaller than 10 kB
              limit: 10 * 1024,
            },
          },
          /*
            Disabled image compression by default,
            due error in windows 10 because libpng not available.
            The libpng avaible on Linux and Mac system only.
            NOTE: To enable this, first you need to install image-webpack-loader.
            npm install -i image-webpack-loader --save
          */
          // {
          //   loader: 'image-webpack-loader',
          //   options: {
          //     mozjpeg: { enabled: false },
          //     gifsicle: { interlaced: false },
          //     optipng: { optimizationLevel: 7 },
          //     pngquant: { quality: '65-90', speed: 4 },
          //   },
          // },
        ],
      },
      {
        test: /\.html$/,
        use: 'html-loader',
      },
      {
        test: /\.(mp4|webm)$/,
        use: {
          loader: 'url-loader',
          options: { limit: 10000 },
        },
      },
    ],
  },
  ignoreWarnings: [
    /Failed to parse source map/,
    /failed to load source map/,
    /Can't resolve '..\/..\/locale'/,
  ],
  plugins: options.plugins.concat([
    /*
      Disabled eslint by default.
      You can enable it to maintain and keep clean your code.
    */
    // new ESLintPlugin({
    //   extensions: 'js',
    //   exclude: 'node_modules',
    //   failOnWarning: true,
    //   failOnError: true,
    //   emitError: true,
    //   emitWarning: true,
    // }),

    
    // Expose NODE_ENV to webpack
    new webpack.EnvironmentPlugin({
      NODE_ENV: 'development',
    }),

    new webpack.DefinePlugin(envKeys), // ✅ NOVO

    // ✅ Corrige Redux Toolkit + Webpack 5 (process/browser)
    new webpack.ProvidePlugin({
      process: 'process/browser.js',
      Buffer: ['buffer', 'Buffer'],
    }),

    // Mantém compatibilidade de localização do moment.js
    new webpack.ContextReplacementPlugin(/^\.\/locale$/, context => {
      if (!/\/moment\//.test(context.context)) return;
      Object.assign(context, {
        regExp: /^\.\/(ja|ko|zh)/,
        request: '../../locale',
      });
    }),
  ]),
  resolve: {
    modules: ['browser', 'domain', 'node_modules', 'app'],
    extensions: ['.js', '.jsx', '.react.js'],
    mainFields: ['browser', 'jsnext:main', 'main'],
    fallback: {
      // ✅ Polyfills modernos do Node para o ambiente browser
      process: require.resolve('process/browser.js'),
      buffer: require.resolve('buffer/'),
      fs: false,
      domain: false,
      path: false,
      os: false,
      assert: false,
      crypto: false,
      util: false,
      stream: false,
      url: false,
      http: false,
      https: false,
      zlib: false,
      vm: false,
      console: false,
      tty: false,
    },
    alias: {
      'dan-components': path.resolve(__dirname, '../../app/components/'),
      'dan-actions': path.resolve(__dirname, '../../app/actions/'),
      'dan-redux': path.resolve(__dirname, '../../app/redux/'),
      'dan-styles': path.resolve(__dirname, '../../app/styles/components/'),
      'dan-api': path.resolve(__dirname, '../../app/api/'),
      'dan-images': path.resolve(__dirname, '../../public/images/'),
      'dan-vendor': path.resolve(__dirname, '../../node_modules/'),
      '/favicons': path.resolve(__dirname, '../../public/favicons/'),
      '/images': path.resolve(__dirname, '../../public/images/'),
    },
  },
  devtool: options.devtool,
  target: 'web', // Make web variables accessible to webpack, e.g. window
  performance: options.performance || {},
});
