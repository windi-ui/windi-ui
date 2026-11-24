import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { it } from 'vitest';

const plugin = createRequire(resolve(import.meta.dirname, 'fixtures/tw3/package.json')).resolve('@windi-ui/tailwind');

// #32: loading the plugin must not look for `tailwindcss` from the working directory.
it('loads from a working directory that cannot resolve tailwindcss', () => {
	execFileSync(process.execPath, ['-e', `require(${JSON.stringify(plugin)})`], {
		cwd: tmpdir(),
		// pnpm puts its hoisted packages, `tailwindcss` among them, on NODE_PATH for the scripts it runs.
		env: { ...process.env, NODE_PATH: '' },
		stdio: 'pipe',
	});
});
