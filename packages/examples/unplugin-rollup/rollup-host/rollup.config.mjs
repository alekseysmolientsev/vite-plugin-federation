import babel from '@rollup/plugin-babel'
import commonjs from '@rollup/plugin-commonjs'
import resolve from '@rollup/plugin-node-resolve'
import replace from '@rollup/plugin-replace'
import federation from "@originjs/vite-plugin-federation/unplugin.mjs";

import pkg from "./package.json" assert { type: "json" };

export default {
  input: "src/index.js",
  preserveEntrySignatures: false,
  plugins: [
    resolve(),
    babel({ babelHelpers: 'bundled' }),
    commonjs(),
    replace({
      'process.env.NODE_ENV': JSON.stringify('production'),
      preventAssignment: true
    }),
    federation({
      remotes: {
        remote_app: "http://localhost:5001/remoteEntry.js",
      },
      shared: ['react', 'react-dom']
    }).rollup(),
  ],
  output: [{ format: "esm", dir: pkg.main }],
};
