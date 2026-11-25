import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { expect, it } from 'vitest';

const require = createRequire(resolve(import.meta.dirname, 'fixtures/tw3/package.json'));
const plugin = require.resolve('@windi-ui/tailwind');

// A CommonJS Tailwind 3 config calls `require('@windi-ui/tailwind')()`.
it('requires as the plugin, with the helpers on it', () => {
	const windiui = require('@windi-ui/tailwind') as Record<string, unknown>;
	expect(windiui).toBeTypeOf('function');
	expect(windiui.default).toBe(windiui);
	expect(windiui.defineConfig).toBeTypeOf('function');
	expect(windiui.safelistSource).toBeTypeOf('function');
});

// A Node.js script or test on Tailwind 3 imports the ES module; Tailwind 3 has no `exports` map for `tailwindcss/plugin`.
it('imports as an ES module on Tailwind 3', () => {
	const url = pathToFileURL(plugin.replace(/\.cjs$/, '.mjs')).href;
	execFileSync(process.execPath, ['--input-type=module', '-e', `const m = await import(${JSON.stringify(url)}); if (typeof m.default !== 'function' || typeof m.defineConfig !== 'function') process.exit(1);`], { stdio: 'pipe' });
});

// #32: loading the plugin must not look for `tailwindcss` from the working directory.
it('loads from a working directory that cannot resolve tailwindcss', () => {
	execFileSync(process.execPath, ['-e', `require(${JSON.stringify(plugin)})`], {
		cwd: tmpdir(),
		// pnpm puts its hoisted packages, `tailwindcss` among them, on NODE_PATH for the scripts it runs.
		env: { ...process.env, NODE_PATH: '' },
		stdio: 'pipe',
	});
});
