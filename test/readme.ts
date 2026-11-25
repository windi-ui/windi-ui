import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import { createJiti } from 'jiti';
import { expect, it } from 'vitest';
import type { Compile, CompileCss } from './helpers';

const readme = readFileSync(resolve(import.meta.dirname, '../README.md'), 'utf8').replaceAll('\r\n', '\n');
// The fenced blocks at the start of a line; the indented ones, in the list of the contributing steps, are shell.
const blocks = [...readme.matchAll(/^```(\w+)\n([\s\S]*?)^```$/gm)].map(([, lang, code]) => ({ lang, code }));
const of = (lang: string) => blocks.filter(b => b.lang === lang).map(b => b.code);

const candidates = [...new Set(of('html').flatMap(code => [...code.matchAll(/class="([^"]+)"/g)].flatMap(m => m[1].split(/\s+/))))];

// Where the modules resolve `@windi-ui/tailwind` and neither git nor ESLint looks, one directory per worker (see forms.ts).
const dir = resolve(import.meta.dirname, `../node_modules/.cache/windiui-readme-${process.env.VITEST_POOL_ID}`);
mkdirSync(dir, { recursive: true });
// A sample that starts with `// <name>.ts` is written under that name, so the CSS samples can load it.
const modules = of('ts').map((code, i) => {
	const path = resolve(dir, /^\/\/ ([\w.-]+\.ts)\n/.exec(code)?.[1] ?? `sample-${i}.ts`);
	writeFileSync(path, code);
	return path;
});

const jiti = createJiti(import.meta.url);
const selector = (cls: string) => new RegExp(`\\.${cls.replace(/[^\w-]/g, c => `\\\\\\${c}`)}(?![\\w-])`);

/** #44: every code sample of the README compiles, and the classes of its HTML samples exist. */
export function readmeSamples(compile: Compile & { css?: CompileCss }) {
	const compileModule = async (path: string) => {
		// A Tailwind config, or a plugin module
		const module = await jiti.import<Record<string, unknown>>(path, { default: true });
		return compile(candidates, 'plugins' in module ? module : { plugins: [module] });
	};

	it.each(modules.map(path => [basename(path), path]))('compiles the TypeScript sample %s', async (_, path) => {
		expect(await compileModule(path)).toMatch(selector('btn'));
	});

	if (compile.css) {
		const css = compile.css;
		it.each(of('css').map((code, i) => [i + 1, code] as const))('compiles CSS sample %i', async (_, code) => {
			// The fixture loads Tailwind itself, and a module of the README is in `dir`.
			const sample = code.replace('@import "tailwindcss";\n', '').replaceAll('"./', `"${dir.replaceAll('\\', '/')}/`);
			expect(await css(sample, candidates)).toMatch(selector('btn'));
		});
	}

	it('emits every class of the HTML samples', async () => {
		const css = (await Promise.all([compile(candidates), ...modules.map(compileModule)])).join('\n');
		for (const cls of candidates) expect(css, cls).toMatch(selector(cls));
	});
}
