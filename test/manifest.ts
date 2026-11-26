import { mkdtempSync, readFileSync, rmSync, statSync, utimesSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import { defineConfig } from '@windi-ui/tailwind/config';
import { safelistSource } from '@windi-ui/tailwind/safelist';
// The built package: the root does not depend on it.
import { manifestTypes } from '../packages/windiui-core/dist/index.mjs';
import { createEngine, type Palettes } from '../packages/windiui-core/dist/theme.mjs';
import type { Compile } from './helpers';

/** #49: the files of the `manifest` option, with the palettes of the Tailwind the test runs. */
export function manifest(compile: Compile, palettes: Palettes) {
	it('writes the manifest of `engine.manifest()` and its types, and only when they change', async () => {
		const dir = mkdtempSync(join(tmpdir(), 'windiui-manifest-'));
		const files = { json: join(dir, 'windiui.manifest.json'), dts: join(dir, 'types', 'windiui.d.ts') };
		const config = defineConfig({
			presets: ['nuxt-ui'],
			overrides: { solid: { 'yellow,lime': { bg: '700' } } },
			build: b => b.addColor('brand', 'teal'),
		});

		try {
			await compile([], {}, { ...config, manifest: files });
			const expected = createEngine(config, { palettes }).manifest();
			expect(readFileSync(files.json, 'utf8')).toBe(`${JSON.stringify(expected, null, 2)}\n`);
			expect(readFileSync(files.dts, 'utf8')).toBe(manifestTypes(expected));
			expect(expected.overrides.solid).toEqual(['lime', 'yellow']);
			// `safelistSource` takes the manifest for the config
			expect(safelistSource(expected)).toBe(safelistSource(config, { palettes: Object.keys(palettes) }));

			// Content that did not change is not written again, so a watcher does not rebuild
			const old = new Date(2000, 0, 1);
			for (const file of Object.values(files)) utimesSync(file, old, old);
			await compile([], {}, { ...config, manifest: files });
			for (const file of Object.values(files)) expect(statSync(file).mtime).toEqual(old);

			await compile([], {}, { ...config, build: b => b.addColor('brand', 'teal').removeVariant('outline'), manifest: { json: files.json } });
			expect(readFileSync(files.json, 'utf8')).not.toContain('"outline"');
			expect(statSync(files.dts).mtime).toEqual(old);
		} finally {
			rmSync(dir, { recursive: true, force: true });
		}
	});
}
