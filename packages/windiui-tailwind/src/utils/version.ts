import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const versions = new Map<string, string | undefined>();

/** The version of the `tailwindcss` package `file` belongs to, if it belongs to one. */
function tailwindVersionOf(file: string) {
	if (!versions.has(file)) {
		let version: string | undefined;
		for (let dir = dirname(file); dirname(dir) !== dir; dir = dirname(dir)) {
			const path = join(dir, 'package.json');
			if (!existsSync(path)) continue;

			const pkg = JSON.parse(readFileSync(path, 'utf8')) as { name?: string, version?: string };
			if (pkg.name === 'tailwindcss') version = pkg.version;
			break;
		}

		versions.set(file, version);
	}

	return versions.get(file);
}

/** The call stack, from this function outwards: for each frame, the version of the Tailwind its file belongs to, if any. */
function callers() {
	// eslint-disable-next-line @typescript-eslint/unbound-method -- put back as it was found
	const prepare = Error.prepareStackTrace;
	Error.prepareStackTrace = (_, sites) => sites.map(site => site.getFileName());
	const files = new Error().stack as unknown as (string | null | undefined)[];
	Error.prepareStackTrace = prepare;

	return files.map(file => file ? tailwindVersionOf(file.startsWith('file:') ? fileURLToPath(file) : file) : undefined);
}

/**
 * Whether Tailwind itself made the call `depth` frames above the function that asks, as it does for an `@plugin` block.
 * It is `false` when that Tailwind cannot be found, for example when it is bundled.
 */
export function calledByTailwind(depth: number) {
	return callers()[depth + 2] != null;
}

/**
 * Whether the Tailwind that is calling the plugin is at least this version. The plugin API does not carry a version,
 * and the `tailwindcss` that resolves from here or from the working directory need not be the one that runs, so this
 * goes by the call stack. It is `false` when that Tailwind cannot be found, for example when it is bundled.
 */
export function tailwindAtLeast(...min: [number, number, number]) {
	for (const version of callers()) {
		if (!version) continue;

		const parts = version.split('.').map(part => parseInt(part));
		for (let i = 0; i < 3; i++) {
			if (parts[i] !== min[i]) return parts[i] > min[i];
		}

		return true;
	}

	return false;
}
