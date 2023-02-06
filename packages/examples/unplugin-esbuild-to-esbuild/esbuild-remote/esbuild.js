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
      const tsx = await fs.promises.readFile(args.path, 'utf8')
      const result = babel.transformSync(tsx, { plugins: [plugin.default({}, { runtime: 'automatic' })] })
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
    federation({
      name: 'esbuild',      
      exposes: {
        "./RemoteApp": "./src/components/Button.jsx"
      },
      shared: {
        react: {
          requiredVersion: '17.0.2'
        }, 
        'react-dom': {
          requiredVersion: '17.0.2'
        }, 
      }
    }).esbuild(),
    jsxPluginReact,
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