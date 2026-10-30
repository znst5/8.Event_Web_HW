const path = require('path');
const webpack = require('webpack');
const HtmlWebPackPlugin = require('html-webpack-plugin');

const isProduction = process.env.NODE_ENV === 'production';

const AMVERA_BACKEND_URL = 'https://amvera.tech';
const AMVERA_WS_URL = 'wss://chat-backend-znst5.msk1.amvera.tech';

module.exports = {
    entry: './src/index.js',
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'js/[name].[contenthash:8].js',
        publicPath: 'auto',
        clean: true,
    },
    target: 'web',
    module: {
        rules: [
          {
              test: /\.js$/,
              exclude: /node_modules/,
              type: 'javascript/auto',
              use: {
                  loader: 'babel-loader',
                  options: {
                      presets: ['@babel/preset-env'],
                  },
            },
      },
            {
              test: /\.(png|jpe?g|gif|svg|webp)$/i,
              type: 'asset',
              generator: {
                  filename: 'asset/images/[name].[hash:8][ext]',
                  },
            },
          {
              test: /\.(woff2?|eot|ttf|otf)$/i,
              type: 'asset/resource',
              generator: {
                  filename: 'asset/fonts/[name].[hash:8][ext]',
                  },
          },

      ],
  },
    plugins: [
        new HtmlWebPackPlugin({
            template: './src/index.html',
            filename: './index.html',
        }),
        new webpack.DefinePlugin({
            AMVERA_BACKEND_URL: JSON.stringify('https://chat-backend-znst5.msk1.amvera.tech'),
            AMVERA_WS_URL: JSON.stringify('wss://chat-backend-znst5.msk1.amvera.tech'),
      }),
    ],
    resolve: {
        extensions: ['js', '.json'],
    },
};
