import { EmittedAsset, EmittedChunk } from "rollup";
import fs from 'fs';
import { lstat, readdir, realpath } from 'fs/promises';
import { basename, dirname, resolve as pathResolve } from 'path';

export const emitFile = (options: EmittedChunk | EmittedAsset) => {
  const outFileName = options.fileName || options.name;
  if (outFileName) {
    fs.writeFileSync(__dirname + 'dist/' + outFileName, '');
  }
}

export const resolve = async (source: string) => {
  return {
    id: await addJsExtensionIfNecessary(pathResolve(source), false)
  };
}

export const addJsExtensionIfNecessary = async (
	file: string,
	preserveSymlinks: boolean
): Promise<string | undefined> => {
	return (
		(await findFile(file, preserveSymlinks)) ??
		(await findFile(file + '.mjs', preserveSymlinks)) ??
		(await findFile(file + '.js', preserveSymlinks))
	);
}

async function findFile(file: string, preserveSymlinks: boolean): Promise<string | undefined> {
	try {
		const stats = await lstat(file);
		if (!preserveSymlinks && stats.isSymbolicLink())
			return await findFile(await realpath(file), preserveSymlinks);
		if ((preserveSymlinks && stats.isSymbolicLink()) || stats.isFile()) {
			// check case
			const name = basename(file);
			const files = await readdir(dirname(file));

			if (files.includes(name)) return file;
		}
	} catch {
		// suppress
	}
}