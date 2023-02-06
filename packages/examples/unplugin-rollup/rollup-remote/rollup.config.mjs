import babel from '@rollup/plugin-babel'
import commonjs from '@rollup/plugin-commonjs'
import resolve from '@rollup/plugin-node-resolve'
import federation from "@originjs/vite-plugin-federation/unplugin.mjs";
import replace from '@rollup/plugin-replace'

import pkg from './package.json' assert { type: 'json' }

export default {
  input: 'src/index.js',
  plugins: [
    resolve(),
    babel({ babelHelpers: 'bundled' }),
    commonjs(),
    replace({
      'process.env.NODE_ENV': JSON.stringify('production'),
      preventAssignment: true
    }),
    federation({
      filename: 'remoteEntry.js',
      exposes: {
        './Button': './src/button.jsx'
      },
      shared: ['react', 'react-dom']
    }).rollup(),
  ],
  output: {
    format: 'esm',
    dir: pkg.main,
    // minifyInternalExports:false
  },
  // external: ['react', 'react-dom'],

  // treeshake:false,
}
