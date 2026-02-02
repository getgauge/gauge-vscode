'use strict';
const webpack = require('webpack');
const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');

module.exports = function(env, argv) {
    if (env === undefined) {
        env = {};
    }

    const production = !!env.production;
    const minify = production;
    const sourceMaps = !env.production;

    const plugins = [
        new webpack.optimize.ModuleConcatenationPlugin(),
        new TerserPlugin({
            parallel: true,
            terserOptions: {
                ecma: 'es2022',
                compress: minify ? {} : false,
                mangle: minify,
                output: {
                    beautify: !minify,
                    comments: false
                },
                sourceMap: sourceMaps,
            }
		})
    ];

    return {
        entry: './src/extension.ts',
        target: 'node',
        output: {
            libraryTarget: 'commonjs2',
            filename: 'extension.js',
            path: path.resolve(__dirname, 'out')
        },
        resolve: {
            extensions: ['.ts',  '.js']
        },
        externals: [
            {
            vscode: "commonjs vscode"
            },
        ],
        devtool: sourceMaps ? 'source-map' : false,
        module: {
            rules: [
                {
                    test: /\.ts$/,
                    use: [{ loader: 'ts-loader' }],
                    exclude: /node_modules/
                }
            ]
        },
        plugins: plugins
    };
};