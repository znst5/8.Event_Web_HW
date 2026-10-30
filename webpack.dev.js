const { merge } = require('webpack-merge');
const common = require('./webpack.common');

module.exports = merge(common, {
    mode: 'development',
    devtool: 'eval-source-map',
    module: {
        rules: [
            {
                test: /\.css$/i,
                use: ['style-loader', 'css-loader', 'postcss-loader'],
            },
        ],
    },
    devServer: {
        historyApiFallback: true,
        open: true,
        compress: true,
        port: 8080,
        hot: true,
        proxy: [
            {
                context: ['/new-user', '/ws'],
                target: 'http://localhost:3000',
                changeOrigin: true,
                ws: true,
            },
        ],
    },
});
