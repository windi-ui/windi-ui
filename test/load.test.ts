import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { expect, it } from 'vitest';

const require = createRequire(resolve(import.meta.dirname, 'fixtures/tw3/package.json'));
const plugin = require.resolve('@windi-ui/tailwind');

// A CommonJS Tailwind 3 config calls `require('@windi-ui/tailwind')()`.
it('requires as the plugin, with the helpers on it', () => {
	const windui = require('@windi-ui/tailwind') as Record<string, unknown>;
	expect(windui).toBeTypeOf('function');
	expect(windui.default).toBe(windui);
	expect(windui.defineConfig).toBeTypeOf('function');
	expect(windui.safelistSource).toBeTypeOf('function');
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
