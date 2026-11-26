import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterAll, expect, it } from 'vitest';

// #52: `windiui audit`, the contrast matrix CLI, run as a user runs it: the built `bin`, in a Tailwind 4 project.

const cli = resolve(import.meta.dirname, '../packages/windiui-tailwind/dist/cli.mjs');
const nuxtUi = resolve(import.meta.dirname, 'config/nuxt-ui.ts');
const dir = mkdtempSync(join(tmpdir(), 'windiui-audit-'));

afterAll(() => rmSync(dir, { recursive: true }));

function audit(...args: string[]) {
	const { status, stdout, stderr } = spawnSync(process.execPath, [cli, 'audit', ...args], { cwd: resolve(import.meta.dirname, 'fixtures/tw4'), encoding: 'utf8' });
	return { status, stdout, stderr };
}

it.each([
	['the default config', []],
	['the `nuxt-ui` preset', ['--config', nuxtUi]],
])('fails on %s, and `--fix` prints the calls that make it pass', (_, config) => {
	const fix = audit(...config, '--text', '4.5', '--border', '3', '--fix');
	expect(fix.status).toBe(1);
	expect(fix.stdout).toMatchSnapshot();

	// Paste-ready: in the `build` of a JavaScript config, the calls make every cell pass
	const file = join(dir, `fixed-${config.length}.js`);
	writeFileSync(file, `export default { presets: ${config.length ? "['nuxt-ui']" : '[]'}, build(b) {\n${fix.stdout}} };\n`);
	const fixed = audit('--config', file, '--text', '4.5', '--border', '3');
	expect(fixed.status).toBe(0);
	expect(fixed.stderr).toMatch(/^All \d+ cells pass\.$/m);
});

it('prints the matrix as a table, as markdown or as JSON', () => {
	const json = audit('--format', 'json');
	const { cells } = JSON.parse(json.stdout) as { cells: { failing: string[] }[] };
	// 4 variants, Tailwind's 26 palettes with `default` and `accent`, light and dark, at rest and on hover
	expect(cells).toHaveLength(4 * 28 * 4);
	expect(json.stderr).toContain(`${cells.filter(c => c.failing.length).length} of 448 cells fail.`);

	const table = audit().stdout.split('\n');
	expect(table[0]).toBe('variant  color    mode   state  pair   ratio  result');
	expect(table).toContainEqual(expect.stringMatching(/^solid +yellow +light +rest +fg\/bg +2\.\d\d +FAIL \(needs bg 700\)$/));

	const markdown = audit('--format', 'markdown').stdout.split('\n');
	expect(markdown.slice(0, 2)).toEqual(['| variant | color | mode | state | pair | ratio | result |', '| --- | --- | --- | --- | --- | --- | --- |']);
	expect(markdown).toHaveLength(table.length + 1);
});

it('exits with 2 on a usage error', () => {
	const { status, stderr } = audit('--text', 'high');
	expect(status).toBe(2);
	expect(stderr).toContain('--text takes a contrast ratio');
});
