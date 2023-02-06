import { createUnplugin } from 'unplugin';
import type {
  ConfigEnv,
  UserConfig,
  ViteDevServer,
  ResolvedConfig
} from 'vite'
import virtual from '@rollup/plugin-virtual'
import { prodRemotePlugin } from './prod/remote-production'
import type { VitePluginFederationOptions } from '../types'
import { builderInfo, DEFAULT_ENTRY_FILENAME, DYNAMIC_LOADING_CSS_PREFIX, EXPOSES_KEY_MAP, parsedOptions } from './public'
import type { PluginHooks } from '../types/pluginHooks'
import type { ModuleInfo } from 'rollup'
import { prodSharedPlugin } from './prod/shared-production'
import { prodExposePlugin } from './prod/expose-production'
import { devSharedPlugin } from './dev/shared-development'
import { devRemotePlugin } from './dev/remote-development'
import { devExposePlugin } from './dev/expose-development'
import findNodeModules from 'find-node-modules';
import fs from 'fs';
import { sep } from 'path';

export default function federation(
  options: VitePluginFederationOptions
): Record<string, any> {
  options.filename = options.filename
    ? options.filename
    : DEFAULT_ENTRY_FILENAME

  let pluginList: PluginHooks[] = []
  let virtualMod
  let registerCount = 0

  function registerPlugins(mode: string, command: string) {
    if (mode === 'development' || command === 'serve') {
      pluginList = [
        devSharedPlugin(options),
        devExposePlugin(options),
        devRemotePlugin(options)
      ]
    } else if (mode === 'production' || command === 'build') {
      pluginList = [
        prodSharedPlugin(options),
        prodExposePlugin(options),
        prodRemotePlugin(options)
      ]
    } else {
      pluginList = []
    }
    builderInfo.isHost = !!(
      parsedOptions.prodRemote.length || parsedOptions.devRemote.length
    )
    builderInfo.isRemote = !!(
      parsedOptions.prodExpose.length || parsedOptions.devExpose.length
    )
    builderInfo.isShared = !!(
      parsedOptions.prodShared.length || parsedOptions.devShared.length
    )

    let virtualFiles = {}
    pluginList.forEach((plugin) => {
      if (plugin.virtualFile) {
        virtualFiles = Object.assign(virtualFiles, plugin.virtualFile)
      }
    })
    virtualMod = virtual(virtualFiles)
  }

  function setUpOptions(_options) {
    // rollup doesnt has options.mode and options.command
    if (!registerCount++) {
      registerPlugins((options.mode = options.mode ?? 'production'), '')
    }

    if (typeof _options.input === 'string') {
      _options.input = { index: _options.input }
    }
    _options.external = _options.external || []
    if (!Array.isArray(_options.external)) {
      _options.external = [_options.external as string]
    }
    for (const pluginHook of pluginList) {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      pluginHook.options?.call(this, _options)
    }
    return _options
  }

  const unplugin = createUnplugin((() => {
    return {
      name: 'unplugin:originjs:federation',
      // for scenario vite.config.js build.cssCodeSplit: false
      // vite:css-post plugin will summarize all the styles in the style.xxxxxx.css file
      // so, this plugin need run after vite:css-post in post plugin list
      enforce: 'post',
      // apply:'build',
      options(_options) {
        const outOption = setUpOptions.call(this, _options);
        return outOption;
      },

      config(config: UserConfig, env: ConfigEnv) {
        options.mode = env.mode
        registerPlugins(options.mode, env.command)
        registerCount++
        for (const pluginHook of pluginList) {
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          pluginHook.config?.call(this, config, env)
        }
  
        // only run when builder is vite,rollup doesnt has hook named `config`
        builderInfo.builder = 'vite'
        builderInfo.assetsDir = config?.build?.assetsDir ?? 'assets'
      },
      configureServer(server: ViteDevServer) {
        for (const pluginHook of pluginList) {
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          pluginHook.configureServer?.call(this, server)
        }
      },

      configResolved(config: ResolvedConfig) {
        for (const pluginHook of pluginList) {
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          pluginHook.configResolved?.call(this, config)
        }
      },

      buildStart(inputOptions) {
        for (const pluginHook of pluginList) {
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          pluginHook.buildStart?.call(this, inputOptions)
        }
      },

      resolveId(...args) {
        const v = virtualMod.resolveId.call(this, ...args)
        if (v) {
          return v
        }
        return null
      },

      load(...args) {
        const v = virtualMod.load.call(this, ...args)
        if (v) {
          return v
        }
        return null
      },

      transform(code: string, id: string) {
        for (const pluginHook of pluginList) {
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          const result = pluginHook.transform?.call(this, code, id)
          if (result) {
            return result
          }
        }
        return code
      },

      moduleParsed(moduleInfo: ModuleInfo): void {
        for (const pluginHook of pluginList) {
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          pluginHook.moduleParsed?.call(this, moduleInfo)
        }
      },
  
      outputOptions(outputOptions) {
        for (const pluginHook of pluginList) {
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          pluginHook.outputOptions?.call(this, outputOptions)
        }
        return outputOptions
      },
  
      renderChunk(code, chunkInfo, _options) {
        for (const pluginHook of pluginList) {
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          const result = pluginHook.renderChunk?.call(
            this,
            code,
            chunkInfo,
            _options
          )
          if (result) {
            return result
          }
        }
        return null
      },
  
      generateBundle: function (_options, bundle, isWrite) {
        for (const pluginHook of pluginList) {
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          pluginHook.generateBundle?.call(this, _options, bundle, isWrite)
        }
      },

      esbuild: {
        setup: (build) => {
          const inputOptions = setUpOptions(options);
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          const paths = findNodeModules({ relative: false });

          const context = {
              emitFile: (emitFile) => emitFile.name,
              getModuleInfo: (id) => ({ id, importedIds: [] }),
              resolve: (packageName) => {
                const packages = packageName.split('/');
                let id = ''; 
                
                paths.forEach((item) => {
                  const isResolved = fs.readdirSync(item, { withFileTypes: true })
                    .find(dir => dir.isDirectory() && dir.name === packages[0]);
                  if (isResolved) {
                    id = item + sep + isResolved.name
                  }
                });    
                packages.slice(1).forEach(_package => {
                  const isResolved =  fs.readdirSync(id, { withFileTypes: true })
                    .find(dir => dir.isDirectory() && dir.name === _package);
                  if (isResolved) {
                    id += sep + isResolved.name
                  }
                });
                return { id: id + sep + 'index.js' };
              },
              getFileName: (emitFileId) => '__federation_shared_' + emitFileId + '.js'
          };

          const remotesResolveFilter = new RegExp(Object.keys(options.remotes || { _: '' }).map(item => '(' + item + ')/.*').join('|'));

          if (parsedOptions.prodExpose.length) {
            build.initialOptions.entryPoints.push({
              in: '__remoteEntryHelper__',
              out: 'remoteEntry'
            });
            
            parsedOptions.prodExpose.forEach(expose => {                          
              build.initialOptions.entryPoints.push({
                  in: expose[1].import.replace('./', ''),
                  out: `__federation_expose_${expose[0].replace('./', '')}`
              });
            });
          }
          if (parsedOptions.prodShared.length) {
            build.initialOptions.entryPoints.push({
                in: '__federation_fn_import',
                out: '__federation_fn_import'
            });
            build.initialOptions.entryPoints.push({
                in: '__federation_lib_semver',
                out: '__federation_lib_semver'
            });

            parsedOptions.prodShared.forEach(shared => {
              build.initialOptions.entryPoints.push({
                in: '__federation_shared_' + shared[0],
                out: '__federation_shared_' + shared[0],
              });
            })  
        }

          build.onStart(async () => {            
            for (const pluginHook of pluginList) {
              // eslint-disable-next-line @typescript-eslint/ban-ts-comment
              // @ts-ignore
              await pluginHook.buildStart?.call(context, inputOptions);                                                
            }
            for (const pluginHook of pluginList) {
              // eslint-disable-next-line @typescript-eslint/ban-ts-comment
              // @ts-ignore
              await pluginHook.outputOptions?.call(context, inputOptions)
            }
          });

          // exposes
          build.onResolve({ filter: /^__remoteEntryHelper__$/ }, () => {
            const exposeResult = virtualMod.resolveId.call(context, '__remoteEntryHelper__');
            return { 
              path: DEFAULT_ENTRY_FILENAME, 
              namespace: '__remoteEntryHelper__', 
              pluginData: {
                exposeResult
              }
            };                                
          });
          build.onLoad({ filter: /.*/, namespace: '__remoteEntryHelper__' }, async (args) => {
              let code = virtualMod.load.call(context, args.pluginData.exposeResult);
              if (code) {
                for (const expose of parsedOptions.prodExpose) {
                  const fileName = EXPOSES_KEY_MAP.get(expose[0])
                  const slashPath = './' + fileName + '.js';
                  code = code.replace(`\${__federation_expose_${expose[0]}}`, slashPath);

                  const cssSlashPath = fileName + '.css';
                  code = code.replace(
                    new RegExp(`(["'])${DYNAMIC_LOADING_CSS_PREFIX}.*?\\1`, 'g'),
                    (str) => {
                      const filepath = str.slice(
                        (`'` + DYNAMIC_LOADING_CSS_PREFIX).length,
                        -1
                      )
                      if (filepath) {
                        return '["' + cssSlashPath + '"]';
                      } else {
                        return str;
                      }
                    }
                  );
                }  
                return {
                    contents: code, loader: 'js'
                };
              }
          });      
          
          //  remotes
          build.onResolve({ filter: remotesResolveFilter }, async (args) => {
            const exposeResult = virtualMod.resolveId.call(context, '__federation__');
            return {
                path: args.path,
                namespace: '__federation__',
                pluginData: {
                  data: exposeResult
                }
            };
          });
          build.onLoad({ filter: /.*/, namespace: '__federation__' }, async args => {
              let code = virtualMod.load.call(context, args.pluginData.data);
              const pluginHook = pluginList.find(plugin => plugin.name === 'originjs:remote-production');
              // eslint-disable-next-line @typescript-eslint/ban-ts-comment
              // @ts-ignore
              code = await pluginHook.transform?.call(context, code, '\0virtual:__federation__');
              const [ module, componentName ] = args.path.split('/');
              code = code + `
                const __federation_var_remote_appRemoteApp = await __federation_method_getRemote('${module}', './${componentName}');
                export default __federation_method_unwrapDefault(__federation_var_remote_appRemoteApp); 
              `;
              return {
                  contents: code, loader: 'js'
              };
          });    
          
          // shared
          build.onResolve({ filter: /^__federation_fn_import$/ }, () => {
            const federation_fn = virtualMod.resolveId.call(context, '__federation_fn_import');
            return { 
              path: '__federation_fn_import', 
              namespace: '__federation_fn_import', 
              pluginData: {
                data: federation_fn
              }
            };                                
          });
          build.onLoad({ filter: /.*/, namespace: '__federation_fn_import' }, async args => {
            let code = virtualMod.load.call(context, args.pluginData.data);
            const pluginHook = pluginList.find(plugin => plugin.name === 'originjs:remote-production');
              // eslint-disable-next-line @typescript-eslint/ban-ts-comment
              // @ts-ignore
            code = await pluginHook.transform?.call(context, code, '\0virtual:__federation_fn_import');
            return {
              contents: code, loader: 'js'
            };
          });
          build.onResolve({ filter: /^__federation_lib_semver$/ }, () => {
            const federation_lib = virtualMod.resolveId.call(context, '__federation_lib_semver');
            return { 
              path: '__federation_lib_semver', 
              namespace: '__federation_lib_semver', 
              pluginData: {
                data: federation_lib
              }
            };                                
          });
          build.onLoad({ filter: /.*/, namespace: '__federation_lib_semver' }, async args => {
            let code = virtualMod.load.call(context, args.pluginData.data);
            const pluginHook = pluginList.find(plugin => plugin.name === 'originjs:remote-production');
              // eslint-disable-next-line @typescript-eslint/ban-ts-comment
              // @ts-ignore
            code = await pluginHook.transform?.call(context, code, '\0virtual:__federation_lib_semver');
            return {
              contents: code, loader: 'js'
            };
          });
          build.onResolve({ filter: /^__federation_shared_.*$/ }, args => {
            const shared = parsedOptions.prodShared.find(item => item[0] === (args.path.split('__federation_shared_')[1]))!;
            return { 
              path: shared[1].id
            }
          })
          build.onResolve({ filter: /^__federation_wrap_shared_.*$/ }, args => {
            const shared = parsedOptions.prodShared.find(item => item[0] === (args.path.split('__federation_wrap_shared_')[1]))!;
            return { 
              path: shared[0],
              namespace: '__federation_wrap_shared',                            
            }
          });
          build.onLoad({ filter: /.*/, namespace: '__federation_wrap_shared' }, async (args) => {
            const code = `
              const importData = await import('./__federation_fn_import.js');
              const data = await importData.importShared('${args.path}');                        
              export default data.default;
            `;

            return {
                contents: code, loader: 'js'
            };
          });
          build.onResolve({ filter: /^\.\/__federation_fn_import.js$/ }, args => {
            return { 
              external: true
            }
          });
          build.onResolve({ filter: /.*/, }, async (args) => {                      
            const index = parsedOptions.prodShared.map(item => item[0]).indexOf(args.path);
            if (index !== -1 && args.kind === 'import-statement') {
              return { 
                path: args.path,
                namespace: '__federation_wrap_shared'
              }
            } else {
              return { }
            }
          });          
        }
      }
    }
  }) as any);

  return unplugin;
}

// export const vitePlugin = unplugin.vite
// export const rollupPlugin = unplugin.rollup
// export const webpackPlugin = unplugin.webpack
// export const esbuildPlugin = unplugin.esbuild