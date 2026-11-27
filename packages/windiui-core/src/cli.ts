#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import type { Config } from './config';
import { createEngine, type AuditCell, type AuditResult, type CalibrationPolicy, type Palettes } from './theme';

const USAGE = `Usage: windiui audit [options]

Checks the contrast of every variant on every color of the WindiUI config, light and dark, at rest and in every
state the variant declares, such as :hover or [data-state=open], and exits with 1 when a pair fails.

Options:
  --config <file>           The config file; left out, the one the plugin finds
  --palettes <file>         A JSON file of palettes by name, each its 11 shades, over Tailwind's
  --text <ratio>            The lowest contrast of fg on bg; 4.5 unless only --border is given
  --border <ratio>          The lowest contrast of a visible border against the backdrop
  --backdrop-light <color>  A light mode backdrop, repeatable; left out, white
  --backdrop-dark <color>   A dark mode backdrop, repeatable; left out, default-950
  --format <format>         table (default), markdown or json
  --fix                     Prints the overrideVariant calls that calibration would add
  -h, --help                Prints this help
`;

const FORMATS = ['table', 'markdown', 'json'];

class UsageError extends Error {}

function ratio(flag: string, value?: string) {
	if (value == null) return;
	const n = Number(value);
	if (!(n > 0)) throw new UsageError(`--${flag} takes a contrast ratio, such as 4.5, not "${value}".`);
	return n;
}

/** `id` as the project in `dir` requires it, or `undefined` when the project does not have it. */
function fromProject<T>(dir: string, id: string): T | undefined {
	try {
		return createRequire(join(dir, 'package.json'))(id) as T;
	} catch (e) {
		if (!['MODULE_NOT_FOUND', 'ERR_PACKAGE_PATH_NOT_EXPORTED'].includes((e as NodeJS.ErrnoException).code ?? '')) throw e;
	}
}

/** Tailwind's palettes from the `@windi-ui/tailwind` of the project in `dir`, of the Tailwind it installs: 3's, or else 4's. */
function tailwindPalettes(dir: string) {
	const palettes = fromProject<Record<'tailwind3' | 'tailwind4', Palettes>>(dir, '@windi-ui/tailwind/palettes');
	return palettes && (fromProject<{ version: string }>(dir, 'tailwindcss/package.json')?.version.startsWith('3.') ? palettes.tailwind3 : palettes.tailwind4);
}

function readPalettes(file: string): Palettes {
	const palettes: unknown = JSON.parse(readFileSync(resolve(file), 'utf8'));
	if (typeof palettes !== 'object' || !palettes || Array.isArray(palettes)) throw new UsageError(`${file} does not hold an object of palettes.`);
	return palettes as Palettes;
}

const quote = (s: string) => `'${s.replace(/[\\']/g, '\\$&')}'`;

/** A value as a JavaScript literal. */
const code = (value: unknown): string => typeof value === 'object' && value
	? `{ ${Object.entries(value).map(([k, v]) => `${/^[a-z_$][\w$]*$/i.test(k) ? k : quote(k)}: ${code(v)}`).join(', ')} }`
	: typeof value === 'string' ? quote(value) : String(value);

/** The `overrideVariant` calls of the overrides, colors with the same override in one call, for the body of `build(b)`. */
function fixCalls({ cells, overrides }: AuditResult) {
	const lines: string[] = [];
	for (const [variant, byColor] of Object.entries(overrides)) {
		const groups = new Map<string, string[]>();
		for (const [color, override] of Object.entries(byColor)) groups.set(code(override), [...groups.get(code(override)) ?? [], color]);
		for (const [override, colors] of groups) {
			lines.push(`b.overrideVariant(${quote(variant)}, ${colors.length > 1 ? `[${colors.map(quote).join(', ')}]` : quote(colors[0])}, ${override});`);
		}
	}
	for (const { variant, color, mode, state } of cells.filter(c => c.failing.length && !c.fix)) {
		lines.push(`// ${variant} ${color} ${mode} ${state}: calibration finds no shade that passes`);
	}
	return lines;
}

const HEAD = ['variant', 'color', 'mode', 'state', 'pair', 'ratio', 'result'];

/** One row per check of each cell; a ratio is cut, not rounded, so that 4.496 shows as 4.49 and not as a failing 4.50. */
const rows = (cells: AuditCell[]) => cells.flatMap(({ variant, color, mode, state, contrast, failing, fix }) =>
	Object.entries(contrast).map(([check, value]) => [variant, color, mode, state, check === 'text' ? 'fg/bg' : 'border', (Math.floor(value * 100) / 100).toFixed(2),
		!failing.includes(check as keyof typeof contrast) ? 'ok'
			: `FAIL (${fix ? `needs ${Object.entries(fix).map(([prop, shade]) => `${prop} ${shade}`).join(', ')}` : 'no fix'})`]));

function table(cells: AuditCell[]) {
	const all = [HEAD, ...rows(cells)];
	const widths = HEAD.map((_, i) => Math.max(...all.map(r => r[i].length)));
	return all.map(r => r.map((v, i) => v.padEnd(widths[i])).join('  ').trimEnd());
}

const markdown = (cells: AuditCell[]) => [HEAD, HEAD.map(() => '---'), ...rows(cells)].map(r => `| ${r.join(' | ')} |`);

/** Runs the CLI on `args` and returns its exit code: 1 for a pair that fails, 2 for a usage error. */
function main(args: string[]) {
	const { values, positionals } = parseArgs({
		args,
		allowPositionals: true,
		options: {
			config: { type: 'string' },
			palettes: { type: 'string' },
			text: { type: 'string' },
			border: { type: 'string' },
			'backdrop-light': { type: 'string', multiple: true },
			'backdrop-dark': { type: 'string', multiple: true },
			format: { type: 'string', default: 'table' },
			fix: { type: 'boolean' },
			help: { type: 'boolean', short: 'h' },
		},
	});

	if (values.help) {
		process.stdout.write(USAGE);
		return 0;
	}
	if (positionals.length !== 1 || positionals[0] !== 'audit') throw new UsageError(`unknown command "${positionals.join(' ')}".`);
	if (!FORMATS.includes(values.format)) throw new UsageError(`--format takes ${FORMATS.join(', ')}, not "${values.format}".`);

	const border = ratio('border', values.border);
	const policy: CalibrationPolicy = {
		text: ratio('text', values.text) ?? (border == null ? 4.5 : undefined),
		border,
		backdrops: { light: values['backdrop-light'], dark: values['backdrop-dark'] },
	};

	// The plugin loads the config and gives Tailwind's palettes: that of the config's project, or else the working directory's
	const dir = values.config != null ? dirname(resolve(values.config)) : process.cwd();
	const tailwind = tailwindPalettes(dir);
	if (!tailwind && values.palettes == null) throw new UsageError(`${dir} has no @windi-ui/tailwind to give Tailwind's palettes; install it, or give --palettes.`);
	const palettes = { ...tailwind, ...(values.palettes != null ? readPalettes(values.palettes) : {}) };

	const loader = fromProject<{ loadWindiUIConfig(options: { config?: string }): { config: Config } }>(dir, '@windi-ui/tailwind/config');
	if (!loader && values.config != null) throw new UsageError(`${dir} has no @windi-ui/tailwind to load ${values.config}.`);
	// Without the plugin, there is no config file it loads
	const config = loader?.loadWindiUIConfig({ config: values.config }).config ?? {};
	const result = createEngine(config, { palettes }).audit(policy);

	const output = values.fix ? fixCalls(result) : values.format === 'json' ? [JSON.stringify(result, null, 2)]
		: values.format === 'markdown' ? markdown(result.cells) : table(result.cells);
	if (output.length) process.stdout.write(`${output.join('\n')}\n`);

	const failing = result.cells.filter(c => c.failing.length).length;
	console.error(failing ? `${failing} of ${result.cells.length} cells fail.` : `All ${result.cells.length} cells pass.`);
	if (result.skipped.length) console.error(`Not checked, as their shades are not literal colors: ${result.skipped.join(', ')}.`);

	return failing ? 1 : 0;
}

try {
	process.exitCode = main(process.argv.slice(2));
} catch (e) {
	console.error(`windiui: ${(e as Error).message.replace(/^WindiUI: /, '')}`);
	if (e instanceof UsageError || (e as NodeJS.ErrnoException).code?.startsWith('ERR_PARSE_ARGS')) console.error('Run `windiui --help` for the options.');
	process.exitCode = 2;
}
