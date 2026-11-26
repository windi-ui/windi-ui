import { COLOR_SHADES, type ColorShade, type ExColorShade } from '../colors';
import type { VariantOverride } from '../variants';
import { luminance, parseColor, type ContrastMetric, type Rgb } from './contrast';
import type { Palette } from './provider';
import { literal, type ResolvedState, type ResolvedVariant } from './resolve';

/** What a policy checks: `fg` on `bg`, and a visible `border` against the backdrop. */
export type CalibrationCheck = 'text' | 'border';

export interface CalibrationPolicy {
	/** The lowest contrast of `fg` on `bg`. Left out, text is not checked. */
	text?: number;
	/** The lowest contrast of a visible `border` against the backdrop. Left out, borders are not checked. */
	border?: number;
	/**
	 * What a translucent background or border is painted over, per mode: literal colors, or shades of the root
	 * variables such as `'white'` or `'default-950'`. A pair passes over every one. Left out, `white` in light mode
	 * and `default-950` in dark.
	 */
	backdrops?: { light?: string[], dark?: string[] };
	/** The contrast function, for another metric such as APCA. Left out, the ratio of WCAG 2 (or the engine's metric). */
	metric?: ContrastMetric;
}

/** The shades a strategy chooses for the properties of one cell. */
export type CalibrationFix = Partial<Record<'bg' | 'fg' | 'border', ExColorShade>>;

/** A (variant, color, mode, state) whose pair does not meet the policy, as a strategy gets it. */
export interface CalibrationCell {
	variant: string;
	color: string;
	mode: 'light' | 'dark';
	state: 'rest' | 'hover';
	/** The colors of the cell, as `engine.resolve` gives them. */
	values: ResolvedState;
	/** The 11 shades of the color. */
	palette: Palette;
	/** The shade a `seed` palette spec holds its seed at; left out for other colors. */
	anchor?: ColorShade;
	/** The checks of the policy that fail with `fix` applied to the cell; none when it passes. */
	failing(fix?: CalibrationFix): CalibrationCheck[];
}

/** A strategy of your own: the shades that repair the cell, or nothing when it cannot. */
export type CalibrationStrategyFunction = (cell: CalibrationCell) => CalibrationFix | undefined;

export type CalibrationStrategy = 'shift-bg' | 'flip-fg' | 'anchor-seed' | CalibrationStrategyFunction;

export interface CalibrateOptions {
	/** How a failing cell is repaired; a list is tried in order until one passes. Left out, `'shift-bg'`. */
	strategy?: CalibrationStrategy | CalibrationStrategy[];
}

/** A cell that did not meet the policy before calibration, or on its turn. */
export interface CalibrationReportEntry {
	variant: string;
	color: string;
	mode: 'light' | 'dark';
	state: 'rest' | 'hover';
	/** The strategy that made the cell pass, by name, or the name of a function; left out when none did. */
	strategy?: string;
	/** The lowest contrast of each check of the policy after calibration, over the backdrops. */
	contrast: Partial<Record<CalibrationCheck, number>>;
}

export interface CalibrationResult {
	/** Only the differences, by variant and color: the shape of the `overrides` option. */
	overrides: Record<string, Record<string, VariantOverride>>;
	report: CalibrationReportEntry[];
}

/** A color to calibrate: its name, its shades as literal colors and, for a seed, its anchor. */
export interface CalibrationTarget {
	name: string;
	palette: Palette;
	anchor?: ColorShade;
}

/** What calibration runs on: the variants of a build, and how they resolve. */
export interface CalibrationContext {
	variants: string[];
	resolve(variant: string, color: string, palette: Palette, extra?: VariantOverride): ResolvedVariant;
	/** The literal color of a shade of the root variables, such as `white`. */
	root(shade: string): string | undefined;
	metric: ContrastMetric;
}

type Mode = CalibrationCell['mode'];
type State = CalibrationCell['state'];
type Prop = keyof CalibrationFix;
/** What a built-in strategy needs besides the cell: the colors of the cell over the first backdrop. */
type Paint = (fix: CalibrationFix) => Record<Prop | 'backdrop', Rgb>;

const CELLS = [['light', 'rest'], ['light', 'hover'], ['dark', 'rest'], ['dark', 'hover']] as const;

/** `color` at `alpha` over `under`, blended in sRGB as a browser does; throws without `under` unless it is opaque. */
function over(color: Rgb, alpha: number, under?: Rgb) {
	if (alpha === 1) return color;
	if (!under) throw new Error('WindiUI: no backdrop.');
	return color.map((x, i) => x * alpha + under[i] * (1 - alpha)) as Rgb;
}
/** The index of a shade of the color itself, `-1` for anything else. */
const index = (shade?: ExColorShade) => COLOR_SHADES.indexOf(shade as ColorShade);

/** The 11 shades as literal colors that `parseColor` reads, or `undefined` when one is not, such as a variable. */
export function literalPalette(shades: Partial<Palette>): Palette | undefined {
	const palette = Object.fromEntries(COLOR_SHADES.map(s => [s, literal(shades[s] ?? '')])) as Palette;
	try {
		for (const color of Object.values(palette)) parseColor(color);
		return palette;
	} catch {
		return;
	}
}

/** Of `fg` and a visible `bg`, the shades of the color, nearer to 500 first: the one a pair fails by, then the other. */
function offending({ values }: CalibrationCell): Prop[] {
	const distance = (prop: Prop) => index(values[prop].shade) < 0 || (prop === 'bg' && !values.bg.opacity) ? Infinity : Math.abs(index(values[prop].shade) - 5);
	return (['bg', 'fg'] as const).filter(p => distance(p) < Infinity).sort((a, b) => distance(a) - distance(b));
}

/** Walks the shade of `prop` away from what it is checked against until `check` passes. */
function walk(cell: CalibrationCell, paint: Paint, prop: Prop, check: CalibrationCheck, fix: CalibrationFix) {
	const colors = paint(fix);
	const against = luminance(colors[prop === 'fg' ? 'bg' : prop === 'bg' ? 'fg' : 'backdrop']);
	const own = luminance(colors[prop]);
	const step = own < against || (own === against && cell.mode === 'light') ? 1 : -1;

	for (let i = index(fix[prop] ?? cell.values[prop].shade) + step; i >= 0 && i < COLOR_SHADES.length; i += step) {
		const next = { ...fix, [prop]: COLOR_SHADES[i] };
		if (!cell.failing(next).includes(check)) return next;
	}
}

/** Switches `fg`, or `border`, to the darkest or lightest shade, or black or white, whichever reads better first. */
function flip(cell: CalibrationCell, paint: Paint, check: CalibrationCheck, fix: CalibrationFix) {
	const prop = check === 'text' ? 'fg' : 'border';
	const colors = paint(fix);
	const against = colors[check === 'text' ? 'bg' : 'backdrop'];
	// Where black and white contrast alike by WCAG 2; whichever fails is still tried after the other
	const dark = luminance(against) > Math.sqrt(1.05 * 0.05) - 0.05;
	const order: ExColorShade[] = dark ? ['950', 'black', '50', 'white'] : ['50', 'white', '950', 'black'];

	return order.map(shade => ({ ...fix, [prop]: shade })).find(next => !cell.failing(next).includes(check));
}

const STRATEGIES: Record<Exclude<CalibrationStrategy, CalibrationStrategyFunction>, (cell: CalibrationCell, paint: Paint) => CalibrationFix | undefined> = {
	'shift-bg'(cell, paint) {
		let fix: CalibrationFix | undefined = {};
		for (const check of cell.failing()) {
			const props: Prop[] = check === 'text' ? offending(cell) : index(cell.values.border.shade) < 0 ? [] : ['border'];
			// A faint background, such as one at 10%, may never pass by its own shade: the other one walks then
			const from: CalibrationFix = fix;
			fix = undefined;
			for (const prop of props) fix ??= walk(cell, paint, prop, check, from);
			if (!fix) return;
		}
		return fix;
	},

	'flip-fg'(cell, paint) {
		let fix: CalibrationFix | undefined = {};
		for (const check of cell.failing()) {
			fix = flip(cell, paint, check, fix);
			if (!fix) return;
		}
		return fix;
	},

	'anchor-seed'(cell, paint) {
		if (!cell.anchor || !cell.failing().includes('text') || offending(cell)[0] !== 'bg') return;

		const fix: CalibrationFix = cell.state === 'rest' && cell.values.bg.shade !== cell.anchor ? { bg: cell.anchor } : {};
		return cell.failing(fix).includes('text') ? flip(cell, paint, 'text', fix) : fix;
	},
};

/** Sets `fix` in `override` for one mode and state. */
function set(override: VariantOverride, mode: Mode, state: State, fix: CalibrationFix) {
	if (!Object.keys(fix).length) return;
	const inMode = mode === 'dark' ? override.dark ??= {} : override;
	Object.assign(state === 'hover' ? ((inMode.pseudos ??= {})[':hover'] ??= {}) : inMode, fix);
}

/** The paths of the values of an override. */
const leaves = (value: object, path: string[] = []): string[][] => Object.entries(value)
	.flatMap(([key, v]) => typeof v === 'object' ? leaves(v as object, [...path, key]) : [[...path, key]]);

/** Removes the value at `path`, and the objects it leaves empty. */
function unset<T extends object>(value: T, [key, ...rest]: string[]): T {
	const record = value as Record<string, object>;
	if (rest.length) unset(record[key], rest);
	if (!rest.length || !Object.keys(record[key]).length) delete record[key];
	return value;
}

/** What a cell paints, to tell whether a fix changed it. */
const painted = (resolved: ResolvedVariant, mode: Mode, state: State) => {
	const { bg, fg, border } = resolved[mode][state];
	return [bg, fg, border].map(c => `${c.color} ${c.opacity}`).join();
};

/**
 * Checks `fg` on `bg` and the `border` of every variant on every target, light and dark, at rest and on hover, and
 * repairs a pair that fails the policy with the strategies of `options`. It only ever chooses shades.
 */
export function calibrate(ctx: CalibrationContext, targets: CalibrationTarget[], policy: CalibrationPolicy, { strategy = 'shift-bg' }: CalibrateOptions = {}): CalibrationResult {
	const metric = policy.metric ?? ctx.metric;
	const strategies = [strategy].flat();
	// A default backdrop that is not literal, such as `default-950` given by CSS variables, leaves out the checks it takes
	const backdrops = Object.fromEntries((['light', 'dark'] as const).map(mode => {
		const given = policy.backdrops?.[mode];
		return [mode, (given ?? [mode === 'light' ? 'white' : 'default-950']).map(b => {
			try {
				return parseColor(ctx.root(b) ?? b);
			} catch {
				if (given) throw new Error(`WindiUI: cannot read the ${mode} backdrop "${b}"; give a literal color or a shade of the root variables.`);
			}
		})];
	})) as Record<Mode, (Rgb | undefined)[]>;

	const overrides: CalibrationResult['overrides'] = {};
	const report: CalibrationReportEntry[] = [];

	for (const variant of ctx.variants) for (const { name, palette, anchor } of targets) {
		const original = ctx.resolve(variant, name, palette);
		let current = original;
		let override: VariantOverride = {};
		// The strategy whose fix changed a cell before its turn
		const cause = new Map<string, string>();

		const cell = (resolved: ResolvedVariant, mode: Mode, state: State) => {
			const values = resolved[mode][state];
			const color = (prop: Prop, fix: CalibrationFix) => {
				const shade = fix[prop];
				return parseColor(shade == null ? values[prop].color : index(shade) < 0 ? ctx.root(shade) ?? '' : palette[shade as ColorShade]);
			};
			const paint: Paint = fix => {
				const backdrop = backdrops[mode][0] ?? (mode === 'light' ? [1, 1, 1] : [0, 0, 0]);
				const bg = over(color('bg', fix), values.bg.opacity, backdrop);
				return { backdrop, bg, fg: over(color('fg', fix), values.fg.opacity, bg), border: over(color('border', fix), values.border.opacity, backdrop) };
			};
			// The lowest contrast of each check over the backdrops; a color that is not literal is not checked
			const contrast = (fix: CalibrationFix = {}) => {
				const result: Partial<Record<CalibrationCheck, number>> = {};
				try {
					for (const backdrop of backdrops[mode]) {
						const bg = over(color('bg', fix), values.bg.opacity, backdrop);
						if (policy.text != null) result.text = Math.min(result.text ?? Infinity, metric(over(color('fg', fix), values.fg.opacity, bg), bg));
						if (policy.border != null && values.border.opacity && backdrop) {
							result.border = Math.min(result.border ?? Infinity, metric(over(color('border', fix), values.border.opacity, backdrop), backdrop));
						}
					}
				} catch {
					return {};
				}
				return result;
			};
			const failing = (fix?: CalibrationFix) => Object.entries(contrast(fix)).filter(([check, value]) => value < policy[check as CalibrationCheck]!).map(([check]) => check as CalibrationCheck);

			return { cell: { variant, color: name, mode, state, values, palette, anchor, failing } satisfies CalibrationCell, paint, contrast };
		};

		/**
		 * A hover shade of its own that plays the same part as the shade a fix moves at rest, darker or lighter than
		 * what it is checked against in both states, moves by as many steps, so the state keeps its offset.
		 */
		const follow = (trial: VariantOverride, mode: Mode, fix: CalibrationFix) => {
			const moved = ctx.resolve(variant, name, palette, trial);
			const hover: CalibrationFix = {};
			try {
				const [rest, hovered] = (['rest', 'hover'] as const).map(st => cell(current, mode, st).paint({}));
				for (const [prop, shade] of Object.entries(fix) as [Prop, ExColorShade][]) {
					const [from, to, h] = [index(current[mode].rest[prop].shade), index(shade), index(current[mode].hover[prop].shade)];
					// A hover value that refers to the value at rest has moved with it already
					if (from < 0 || to < 0 || h < 0 || moved[mode].hover[prop].shade !== current[mode].hover[prop].shade) continue;

					const against = prop === 'fg' ? 'bg' : prop === 'bg' ? 'fg' : 'backdrop';
					const darker = (colors: typeof rest) => luminance(colors[prop]) < luminance(colors[against]);
					if (darker(rest) === darker(hovered)) hover[prop] = COLOR_SHADES[Math.min(COLOR_SHADES.length - 1, Math.max(0, h + to - from))];
				}
			} catch {
				// A color that is not literal is not checked, nor followed
			}
			return hover;
		};

		for (const [mode, state] of CELLS) {
			const { cell: now } = cell(current, mode, state);
			let used: string | undefined;
			if (!now.failing().length) {
				if (!cell(original, mode, state).cell.failing().length) continue;
				used = cause.get(`${mode} ${state}`);
			} else {
				for (const s of strategies) {
					const { paint } = cell(current, mode, state);
					const fix = typeof s === 'function' ? s(now) : STRATEGIES[s](now, paint);
					if (!fix || !Object.keys(fix).length) continue;

					const trial = structuredClone(override);
					set(trial, mode, state, fix);
					if (state === 'rest') set(trial, mode, 'hover', follow(trial, mode, fix));

					// Applied as an override, the fix may not take, under an explicit override of the same value
					const resolved = ctx.resolve(variant, name, palette, trial);
					if (cell(resolved, mode, state).cell.failing().length) continue;

					used = typeof s === 'function' ? s.name || 'custom' : s;
					for (const [m, st] of CELLS) {
						if (painted(resolved, m, st) !== painted(current, m, st) && !cause.has(`${m} ${st}`)) cause.set(`${m} ${st}`, used);
					}
					override = trial;
					current = resolved;
					break;
				}
			}

			report.push({ variant, color: name, mode, state, ...(used ? { strategy: used } : {}), contrast: cell(current, mode, state).contrast() });
		}

		// Only the differences: a value that changes nothing, such as one under an explicit override, is left out
		const result = JSON.stringify(current);
		for (const path of leaves(override)) {
			const without = unset(structuredClone(override), path);
			if (JSON.stringify(ctx.resolve(variant, name, palette, without)) === result) override = without;
		}

		if (Object.keys(override).length) (overrides[variant] ??= {})[name] = override;
	}

	return { overrides, report };
}
