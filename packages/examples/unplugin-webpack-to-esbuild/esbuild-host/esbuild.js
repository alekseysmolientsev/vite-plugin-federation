import * as esbuild from 'esbuild';
import fs from 'fs';
import babel from '@babel/core';
import plugin from '@babel/plugin-transform-react-jsx';
import federation from '@originjs/vite-plugin-federation/unplugin.mjs';

const DIST_DIR = 'dist';

const jsxPluginReact = {
  name: 'jsx-react',
  setup(build) {
    build.onLoad({ filter: /\.jsx$/ }, async (args) => {
      const jsx = await fs.promises.readFile(args.path, 'utf8')
      const result = babel.transformSync(jsx, { plugins: [plugin.default({}, { runtime: 'automatic' })] })
      return { contents: result.code }
    })
  },
}

await esbuild.build({
  entryPoints: ['src/main.jsx'],
  loader: {
    '.svg': 'file',
    '.html': 'text',
  },
  bundle: true,
  minify: false,
  sourcemap: false,
  target: ['esnext'],
  write: true,
  splitting: true,
  outdir: DIST_DIR,
  format: 'esm',
  allowOverwrite: true,
  plugins: [
    jsxPluginReact,
    federation({
      name: 'host',      
      remotes: {
        nav: {
          external: 'http://localhost:3007/remoteEntry.js',
          format: 'var',
        }
      },
      shared: ['react', 'react-dom']
    }).esbuild()
  ],
}).then(() => {
  fs.copyFile(
    `index.html`,
    `${DIST_DIR}/index.html`,
    (err) => {
      if (err) throw err;
      console.log(`${DIST_DIR}/index.html: copied.`);
    },
  );
})