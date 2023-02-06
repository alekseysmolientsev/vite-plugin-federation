import resolve from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';

import pkg from './package.json' assert { type: "json" }

export default [
  {
    input: 'src/utils/semver/index.ts',
    plugins: [typescript({ include: './src/**/*.ts', module: 'esnext' })],
    external: ['path'],
    output: [{ format: 'esm', file: 'dist/satisfy.js' }]
  },
  {
    input: 'src/index.ts',
    plugins: [
      resolve(),      
      typescript({ include: './src/**/*.ts', module: 'esnext' })
    ],
    external: ['path'],
    output: [
      { format: 'cjs', file: pkg.main, exports: 'auto' },
      { format: 'esm', file: pkg.module }
    ]
  },
  {
    input: 'src/unplugin.ts',
    plugins: [
      json(),
      resolve(),
      commonjs({
        include: /node_modules/,
        requireReturnsDefault: 'auto', // <---- this solves default issue
      }),
      typescript({ include: './src/**/*.ts', module: 'esnext' })
    ],
    external: ['path'],
    output: [
      { format: 'cjs', file: './dist/unplugin.cjs', exports: 'auto' },
      { format: 'esm', file: './dist/unplugin.mjs' }
    ]
  }
]
