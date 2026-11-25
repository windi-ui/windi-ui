import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, it } from 'vitest';
import type { Compile, CompileCss } from './helpers';

const candidates = ['c-red', 'v-solid', 's-lg', 'bg-v', 'bg-c-500', 'btn', 'badge'];

const tsModule = resolve(import.meta.dirname, 'config/windiui.plugin.ts');
// The same module in JavaScript, in a place that resolves the plugin and that neither git nor ESLint looks at.
// One per worker, as the test files run side by side.
const jsModule = resolve(import.meta.dirname, `../node_modules/.cache/windiui-test-${process.env.VITEST_POOL_ID}/windiui.plugin.js`);
mkdirSync(resolve(jsModule, '..'), { recursive: true });
writeFileSync(jsModule, `
	import windiui from '@windi-ui/tailwind';
	export default windiui({ prefix: 'mod', build: builder => builder.removeComponent('badge') });
`);

/** #33: the ways a Tailwind 4 stylesheet loads WindiUI without a JS config. */
export function forms(compile: Compile & { css: CompileCss }) {
	it('loads with a bare `@plugin`', async () => {
		expect(await compile.css('@plugin "@windi-ui/tailwind";', candidates)).toBe(await compile(candidates));
	});

	it('takes the options of an `@plugin` block', async () => {
		const css = await compile.css('@plugin "@windi-ui/tailwind" { prefix: abc; variant-scope: universal; }', candidates);
		expect(css).toBe(await compile(candidates, {}, { prefix: 'abc', variantScope: 'universal' }));
	});

	it('rejects an unknown option', async () => {
		await expect(compile.css('@plugin "@windi-ui/tailwind" { prefx: abc; }', candidates)).rejects.toThrow('unknown option "prefx"');
	});

	it('rejects `build`, which a block cannot hold', async () => {
		await expect(compile.css('@plugin "@windi-ui/tailwind" { build: x; }', candidates)).rejects.toThrow('`build` is a function');
	});

	it.each([tsModule, jsModule])('loads the plugin module %s', async (path) => {
		const css = await compile.css(`@plugin "${path.replaceAll('\\', '/')}";`, candidates);
		expect(css).toContain('--mod-c-500');
		expect(css).toContain('.btn');
		expect(css).not.toContain('.badge');
	});

	it('builds the same from the `/v4` entry', async () => {
		expect(await compile.css('@plugin "@windi-ui/tailwind/v4";', candidates)).toBe(await compile(candidates));
	});
}
