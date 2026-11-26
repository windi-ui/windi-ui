import { chromium, type Page } from 'playwright-core';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createEngine } from '../packages/windiui-core/dist/theme.mjs';
import { tailwind4 } from '../packages/windiui-core/dist/theme/palettes.mjs';
import { bundleEngine, tailwind3, tailwind4 as compileTailwind4 } from './helpers';

// What a snapshot cannot prove: how the emitted CSS cascades and inherits in a real browser.
// It drives an installed Chrome or Edge, so there is no browser download.

const html = `
	<div id="host" class="c-red v-solid bg-v text-v before:bg-v">
		<span id="child" class="bg-v text-v"><b id="grandchild" class="bg-v text-v"></b></span>
		<span id="own" class="v-light bg-v text-v"></span>
	</div>
	<div id="card" class="card"><span id="applied" class="bg-v"></span></div>
	<input id="input" class="c-red v-solid placeholder:text-v" placeholder="placeholder">
	<span id="plain" class="bg-v text-v border border-v"></span>
	<span id="soft" class="bg-v-soft text-v-muted border border-v-accent"></span>
	<span id="modifier" class="c-red v-outline bg-v/50 text-v"></span>
	<div id="faded" class="bg-v/50 text-v/75 border border-v/30"><span id="faded-child" class="bg-v text-v border border-v"></span></div>
	<button id="btn" class="btn">btn</button>
	<button id="btn-solid" class="btn c-blue v-solid"><span id="badge-in" class="badge">badge</span></button>
	<span id="badge" class="badge">badge</span>
	<span id="pseudo" class="before:bg-v-soft"></span>
`;

// `v-scope` only exists outside the universal scope, where the class attribute is the only thing that marks a host.
const card = (scope: Scope) => `.card { @apply c-red v-solid ${scope === 'universal' ? '' : 'v-scope'} bg-v; }`;

const scopes = ['universal', 'element', 'inherit'] as const;
type Scope = typeof scopes[number];

async function launch() {
	for (const channel of ['chrome', 'msedge']) {
		try {
			return await chromium.launch({ channel });
		} catch {}
	}

	if (process.env.CI) throw new Error('No Chrome or Edge to run the browser tests in');
}

const compile = compileTailwind4('tw4');
const browser = await launch();

describe.skipIf(!browser)('in a browser', () => {
	const pages = {} as Record<Scope, Page>;

	// A string, because this project is not typed for the DOM.
	const style = (page: Page, id: string, property: string, pseudo = '') => page.evaluate<string>(
		`getComputedStyle(document.getElementById('${id}'), '${pseudo}').${property}`
	);

	// The root element too: it is where the light mode is set, and a page may put its variant utilities there.
	const painted = (page: Page) => page.evaluate<string>(`JSON.stringify([document.documentElement, ...document.querySelectorAll('[id]')].map(e => {
		const s = getComputedStyle(e);
		return [e.id, s.backgroundColor, s.color, s.borderTopColor, s.outlineColor, getComputedStyle(e, '::before').backgroundColor];
	}), null, 1)`);

	beforeAll(async () => {
		for (const variantScope of scopes) {
			const css = await compile(html.match(/[^\s"<>=]+/g)!, { darkMode: ['selector', '.dark'] }, { variantScope }, card(variantScope));
			pages[variantScope] = await browser!.newPage();
			await pages[variantScope].setContent(`<style>${css}</style>${html}`);
		}
	});

	// Closing Chrome can outlast the 10 s default while the other test files run alongside
	afterAll(() => browser?.close(), 30_000);

	describe.each(['universal', 'element'] as const)('with the %s scope', (scope) => {
		it('gives the descendants of a variant host the default variant', async () => {
			const page = pages[scope];
			expect(await style(page, 'child', 'backgroundColor')).toBe(await style(page, 'plain', 'backgroundColor'));
			expect(await style(page, 'child', 'backgroundColor')).not.toBe(await style(page, 'host', 'backgroundColor'));
			expect(await style(page, 'grandchild', 'color')).toBe(await style(page, 'child', 'color'));
			expect(await style(page, 'grandchild', 'color')).not.toBe(await style(page, 'host', 'color'));
		});

		it('keeps the host variant in ::before', async () => {
			const page = pages[scope];
			expect(await style(page, 'host', 'backgroundColor', '::before')).toBe(await style(page, 'host', 'backgroundColor'));
		});

		it('keeps the host variant in ::placeholder', async () => {
			const page = pages[scope];
			expect(await style(page, 'input', 'color', '::placeholder')).toBe(await style(page, 'host', 'color'));
			expect(await style(page, 'input', 'color', '::placeholder')).not.toBe(await style(page, 'plain', 'color'));
		});
	});

	describe('with the element scope', () => {
		it('keeps an opacity modifier to its element', async () => {
			const page = pages.element;
			for (const property of ['backgroundColor', 'color', 'borderTopColor']) {
				expect(await style(page, 'faded-child', property)).toBe(await style(page, 'plain', property));
				expect(await style(page, 'faded-child', property)).not.toBe(await style(page, 'faded', property));
			}
		});

		it('gives a child of an `@apply v-* v-scope` host the default variant', async () => {
			const page = pages.element;
			expect(await style(page, 'applied', 'backgroundColor')).toBe(await style(page, 'plain', 'backgroundColor'));
			expect(await style(page, 'applied', 'backgroundColor')).not.toBe(await style(page, 'card', 'backgroundColor'));
		});

		it.each(['light', 'dark'] as const)('paints like the universal scope in %s mode', async (colorScheme) => {
			for (const page of [pages.universal, pages.element]) {
				await page.evaluate(`document.documentElement.className = '${colorScheme} bg-v text-v before:bg-v'`);
			}

			// The inherit page stays light: the dark fallback is in use, also in a pseudo-element, which a nested dark selector cannot reach.
			const pseudo = (page: Page) => style(page, 'pseudo', 'backgroundColor', '::before');
			expect(await pseudo(pages.element) === await pseudo(pages.inherit)).toBe(colorScheme === 'light');

			expect(await painted(pages.element)).toBe(await painted(pages.universal));

			for (const page of [pages.universal, pages.element]) {
				await page.hover('#btn');
			}

			expect(await painted(pages.element)).toBe(await painted(pages.universal));
		});
	});

	describe('with the inherit scope', () => {
		it('gives the descendants of a variant host its variant', async () => {
			const page = pages.inherit;
			expect(await style(page, 'grandchild', 'backgroundColor')).toBe(await style(page, 'host', 'backgroundColor'));
			expect(await style(page, 'own', 'backgroundColor')).not.toBe(await style(page, 'host', 'backgroundColor'));
			expect(await style(page, 'plain', 'backgroundColor')).not.toBe(await style(page, 'host', 'backgroundColor'));
		});

		it('stops at `v-scope`', async () => {
			const page = pages.inherit;
			expect(await style(page, 'applied', 'backgroundColor')).toBe(await style(page, 'plain', 'backgroundColor'));
		});
	});

	// #36: the variables behind a palette are set by the page, and may change while it is open.
	describe('with a palette backed by CSS variables', () => {
		const palette = `
			<span id="var-class" class="c-primary bg-c-500"></span>
			<span id="var-utility" class="bg-primary-500"></span>
			<span id="var-default" class="bg-c-500"></span>
			<div id="scope" data-theme-scope>
				<span id="scope-class" class="c-primary bg-c-500"></span>
				<span id="scope-utility" class="bg-primary-500"></span>
				<span id="scope-default" class="bg-c-500"></span>
			</div>
			<div id="other" style="--ui-color-primary-500: rgb(9, 9, 9)"><span id="other-default" class="bg-c-500"></span></div>
		`;

		const outside = ['var-class', 'var-utility', 'var-default'];
		const inside = ['scope-class', 'scope-utility', 'scope-default'];
		let page: Page;

		const backgrounds = (ids: string[]) => Promise.all(ids.map(id => style(page, id, 'backgroundColor')));
		const set = (target: string, color: string) => page.evaluate(`${target}.style.setProperty('--ui-color-primary-500', '${color}')`);

		beforeAll(async () => {
			const css = await compile(palette.match(/[^\s"<>=]+/g)!, {}, {
				default: { vars: '--ui-color-primary' },
				rootSelector: ':root, [data-theme-scope]',
				build: builder => builder.addColor('primary', { vars: '--ui-color-primary' }, { utilities: true }),
			});

			page = await browser!.newPage();
			await page.setContent(`<style>:root { --ui-color-primary-500: rgb(1, 1, 1); }${css}</style>${palette}`);
		});

		it('follows a change at the root', async () => {
			expect(await backgrounds([...outside, ...inside])).toEqual(Array(6).fill('rgb(1, 1, 1)'));

			await set('document.documentElement', 'rgb(2, 2, 2)');
			expect(await backgrounds([...outside, ...inside])).toEqual(Array(6).fill('rgb(2, 2, 2)'));
		});

		it('follows a change inside a scope that `rootSelector` matches', async () => {
			await set('document.getElementById("scope")', 'rgb(3, 3, 3)');

			expect(await backgrounds(inside)).toEqual(Array(3).fill('rgb(3, 3, 3)'));
			expect(await backgrounds(outside)).toEqual(Array(3).fill('rgb(2, 2, 2)'));
			// Elsewhere the default palette was resolved at the root.
			expect(await style(page, 'other-default', 'backgroundColor')).toBe('rgb(2, 2, 2)');
		});
	});

	// #38: a state value that a variant leaves out is a reference to the base value, resolved on the element.
	describe('with the hover state of a variant', () => {
		const subs = ['soft', 'muted', 'accent'] as const;
		const levels = ['', ...subs];
		const builtIn = ['default', 'solid', 'outline', 'light'].flatMap(v => levels.map(l => `${v}${l && `-${l}`}`));
		const ids = [...builtIn, 'night'];
		// `btn` paints the base levels; a `levels-*` component paints the others.
		const states = ids.map(id => {
			const [v, l] = id.split('-');
			return `<span id="${id}" class="${l ? `levels-${l}` : 'btn'} c-blue v-${v}">${id}</span>`;
		}).join('');

		const pages = {} as Record<Scope, Page>;

		const colors = (page: Page, id: string) => page.evaluate<string[]>(
			`(s => [s.backgroundColor, s.color, s.borderTopColor])(getComputedStyle(document.getElementById('${id}')))`
		);

		const paint = async (page: Page, list: string[]) => {
			const painted: Record<string, { rest: string[], hover: string[] }> = {};
			for (const mode of ['light', 'dark']) {
				await page.evaluate(`document.documentElement.className = '${mode}'`);
				for (const id of list) {
					// The page's margin: no element there
					await page.mouse.move(0, 0);
					const rest = await colors(page, id);
					await page.hover(`#${id}`);
					painted[`${mode} ${id}`] = { rest, hover: await colors(page, id) };
				}
			}

			return painted;
		};

		beforeAll(async () => {
			for (const variantScope of scopes) {
				const css = await compile(states.match(/[^\s"<>=]+/g)!, { darkMode: ['selector', '.dark'] }, {
					variantScope,
					build: (builder) => {
						for (const l of subs) {
							builder.addComponent(`levels-${l}`, () => ({
								name: `levels-${l}`,
								style: {},
								applyVariant: [`bg-${l}`, `border-${l}`, `text-${l}`],
								applyVariantPseudos: { ':hover': [`bg-${l}`, `border-${l}`, `text-${l}`] },
							}));
						}

						// A dark block without `pseudos`
						builder.addVariant('night', ({ vars }) => ({
							'bg': vars.color('100'),
							'border': vars.color('600'),
							'fg': vars.color('700'),
							pseudos: { ':hover': { 'bg': vars.color('200') } },
							dark: { 'fg': vars.color('300') },
						}));
					},
				});

				pages[variantScope] = await browser!.newPage();
				await pages[variantScope].setContent(`<style>${css}</style>${states}`);
			}
		});

		// The snapshot was recorded from the literal copies of 0.7.
		it('paints the built-in variants as before, in every scope', async () => {
			const painted = await paint(pages.universal, builtIn);
			await expect(JSON.stringify(painted, null, '\t')).toMatchFileSnapshot('./__snapshots__/browser/variant-states.json');

			expect(await paint(pages.element, builtIn)).toEqual(painted);
			expect(await paint(pages.inherit, builtIn)).toEqual(painted);
		}, 30_000);

		it.each(scopes)('gives the hover state the dark value of a dark block without `pseudos` in the %s scope', async (scope) => {
			const { 'light night': light, 'dark night': dark } = await paint(pages[scope], ['night']);

			expect(dark.rest[1]).not.toBe(light.rest[1]);
			expect(dark.hover[1]).toBe(dark.rest[1]);
			expect(light.hover[1]).toBe(light.rest[1]);
			expect(dark.hover[0]).toBe(light.hover[0]);
		});
	});

	// #39: a `c-*` class gives its overrides to a `v-*` class wherever the two are.
	describe.each([
		['4', compile, (n: number) => `rgb(${n}, ${n}, ${n})`],
		['3', tailwind3(), (n: number) => `${n} ${n} ${n}`],
	] as const)('with per-color overrides on Tailwind %s', (ver, compileWith, rgb) => {
		// Painted like the element they are compared with, with the variant value set inline
		const ref = (id: string, classes: string, value: string, name = 'bg') => `<span id="${id}" class="${classes}" style="--wui-v-${name}: ${value}"></span>`;
		const shades = ['yellow-300', 'yellow-600', 'yellow-700', 'yellow-800', 'blue-600', 'gray-600'];

		const html = `
			<button id="one" class="btn c-yellow v-solid">one</button>
			<button id="reversed" class="btn v-solid c-yellow">reversed</button>
			<div class="c-yellow"><button id="parent" class="btn v-solid">parent</button></div>
			<div class="c-yellow"><div class="c-blue"><button id="nested" class="btn v-solid">nested</button></div></div>
			<span id="applied" class="yellow-solid">applied</span>
			<button id="hover" class="btn c-yellow hover:v-solid">hover</button>
			<button id="md" class="btn md:c-yellow v-solid">md</button>
			<button id="dark" class="btn dark:c-yellow v-solid">dark</button>
			<button id="recipe" class="btn c-yellow v-light">recipe</button>
			<button id="alias" class="btn c-primary v-solid">alias</button>
			<div class="c-yellow"><button id="alias-nested" class="btn c-primary v-solid">alias nested</button></div>
			<button id="brand" class="btn c-brand v-solid">brand</button>
			${['none', 'utilities', 'components', 'base'].map(l => `<span id="l-${l}" class="c-yellow v-solid bg-v l-${l}"></span>`).join('')}
			${shades.map(s => ref(s, `btn v-solid c-${s.split('-')[0]}`, `var(--wui-c-${s.split('-')[1]})`)).join('')}
			${['300', '700'].map(s => ref(`text-yellow-${s}`, 'btn v-light c-yellow', `var(--wui-c-${s})`, 'fg')).join('')}
			${[1, 4, 7].map(n => ref(`rgb-${n}`, 'btn v-solid', rgb(n))).join('')}
			${ref('bg-v-yellow-700', 'c-yellow v-solid bg-v', 'var(--wui-c-700)')}
			${ref('bg-v-mark', 'c-yellow v-solid bg-v', rgb(5))}
		`;

		// A hand-written compound rule from each cascade layer
		const css = `
			.yellow-solid { @apply c-yellow v-solid bg-v; }
			.c-yellow.v-solid.l-none { --wui-v-bg: ${rgb(5)}; }
			@layer utilities { .c-yellow.v-solid.l-utilities { --wui-v-bg: ${rgb(5)}; } }
			@layer components { .c-yellow.v-solid.l-components { --wui-v-bg: ${rgb(5)}; } }
			@layer base { .c-yellow.v-solid.l-base { --wui-v-bg: ${rgb(5)}; } }
		`;

		const modes = ['vars', 'compound'] as const;
		const pages = {} as Record<typeof modes[number], Page>;
		const bg = (page: Page, id: string) => style(page, id, 'backgroundColor');
		const setMode = (page: Page, mode: string) => page.evaluate(`document.documentElement.className = '${mode}'`);

		beforeAll(async () => {
			for (const overrideMode of modes) {
				const built = await compileWith(html.match(/[^\s"<>=]+/g)!, { darkMode: ['selector', '.dark'] }, {
					overrideMode,
					build: builder => builder
						.overrideVariant('solid', 'yellow', { bg: '700', pseudos: { ':hover': { bg: '800' } } })
						.overrideVariant('light', 'yellow', { fg: '700' })
						.addColor('primary', { vars: '--ui-color-primary', overrideVars: { variants: ['solid'] } })
						.addColor('brand', { vars: '--ui-color-brand', overrideVars: { variants: ['solid'] } })
						.overrideVariant('solid', 'brand', { bg: '800' }),
				}, css);

				pages[overrideMode] = await browser!.newPage();
				await pages[overrideMode].setContent(`<style>
					:root { --ui-color-primary-600: ${rgb(1)}; --ui-color-brand-600: ${rgb(3)}; --ui-color-brand-800: ${rgb(4)}; }
					${built}
				</style>${html}`);
			}
		});

		it('overrides on one element in either class order, from a parent and from `@apply`, and not inside another color', async () => {
			const page = pages.vars;
			for (const id of ['one', 'reversed', 'parent']) {
				expect(await bg(page, id)).toBe(await bg(page, 'yellow-700'));
			}

			expect(await bg(page, 'applied')).toBe(await bg(page, 'bg-v-yellow-700'));
			expect(await bg(page, 'nested')).toBe(await bg(page, 'blue-600'));
		});

		it('keeps the override through hover, also with `hover:v-solid`', async () => {
			const page = pages.vars;
			for (const id of ['one', 'hover']) {
				await page.hover(`#${id}`);
				expect(await bg(page, id)).toBe(await bg(page, 'yellow-800'));
			}

			await page.mouse.move(0, 0);
		});

		it('follows `md:c-yellow` and `dark:c-yellow`', async () => {
			const page = pages.vars;
			expect(await bg(page, 'md')).toBe(await bg(page, 'yellow-700'));
			await page.setViewportSize({ width: 600, height: 720 });
			expect(await bg(page, 'md')).toBe(await bg(page, 'gray-600'));
			await page.setViewportSize({ width: 1280, height: 720 });

			expect(await bg(page, 'dark')).toBe(await bg(page, 'gray-600'));
			await setMode(page, 'dark');
			expect(await bg(page, 'dark')).toBe(await bg(page, 'yellow-700'));
			await setMode(page, 'light');
		});

		it.each(modes)('keeps the dark value of the variant where the override has none, in the %s mode', async (mode) => {
			const page = pages[mode];
			const text = (id: string) => style(page, id, 'color');
			expect(await text('recipe')).toBe(await text('text-yellow-700'));
			await setMode(page, 'dark');
			expect(await text('recipe')).toBe(await text('text-yellow-300'));
			await setMode(page, 'light');
		});

		it('only reaches both classes on one element in the compound mode', async () => {
			const page = pages.compound;
			expect(await bg(page, 'one')).toBe(await bg(page, 'yellow-700'));
			expect(await bg(page, 'reversed')).toBe(await bg(page, 'yellow-700'));
			expect(await bg(page, 'parent')).toBe(await bg(page, 'yellow-600'));
		});

		it('forwards the override variables of a palette given by CSS variables', async () => {
			const page = pages.vars;
			// Unset: the variant's shade, or the static override
			expect(await bg(page, 'alias')).toBe(await bg(page, 'rgb-1'));
			expect(await bg(page, 'alias-nested')).toBe(await bg(page, 'rgb-1'));
			expect(await bg(page, 'brand')).toBe(await bg(page, 'rgb-4'));

			await page.evaluate(`['primary', 'brand'].forEach(c => document.documentElement.style.setProperty(\`--ui-color-\${c}-solid-bg\`, '${rgb(7)}'))`);
			for (const id of ['alias', 'alias-nested', 'brand']) {
				expect(await bg(page, id)).toBe(await bg(page, 'rgb-7'));
			}

			await page.evaluate(`document.documentElement.removeAttribute('style')`);
		});

		// Tailwind 4 emits `v-*` in the utilities layer, also the components of a plugin
		// (https://github.com/tailwindlabs/tailwindcss/issues/15045), so a rule in an earlier layer loses whatever its specificity.
		it.runIf(ver === '4')('lets a hand-written compound rule win unlayered and from `@layer utilities` only', async () => {
			const page = pages.vars;
			for (const layer of ['none', 'utilities']) {
				expect(await bg(page, `l-${layer}`)).toBe(await bg(page, 'bg-v-mark'));
			}
			for (const layer of ['components', 'base']) {
				expect(await bg(page, `l-${layer}`)).toBe(await bg(page, 'bg-v-yellow-700'));
			}
		});

		// `:root` is `c-default`; `&:is(.dark *)` alone never matches the root element itself.
		it('applies the dark overrides of the root with the `class` dark mode', async () => {
			const html = `
				<button id="root-outline" class="btn v-outline">root</button>
				<button id="gray-outline" class="btn v-outline c-gray">gray</button>
				<button id="root-solid" class="btn v-solid">root</button>
				${ref('gray-400', 'btn v-solid c-gray', 'var(--wui-c-400)')}
			`;
			const built = await compileWith(html.match(/[^\s"<>=]+/g)!, { darkMode: 'class' }, {
				overrides: { outline: { default: { fg: '900' } }, solid: { default: { bg: '700', dark: { bg: '400' } } } },
			});

			const page = await browser!.newPage();
			await page.setContent(`<style>${built}</style>${html}`);
			await setMode(page, 'dark');
			expect(await style(page, 'root-outline', 'color')).toBe(await style(page, 'gray-outline', 'color'));
			expect(await bg(page, 'root-solid')).toBe(await bg(page, 'gray-400'));
			await page.close();
		});

		// `&:not(.light *)` alone always matches the root element itself, and every element inherits the mode from it (#73).
		it('leaves out the dark overrides of the root on a page set to light with a `:not()` dark mode', async () => {
			const html = `<button id="root-solid" class="btn v-solid">root</button>${ref('gray-700', 'btn v-solid c-gray', 'var(--wui-c-700)')}
				<button id="plain" class="btn">plain</button>${ref('white', 'btn', 'var(--wui-c-white)')}`;
			const built = await compileWith(html.match(/[^\s"<>=]+/g)!, {}, {
				darkSelector: ['variant', ['@media (prefers-color-scheme: dark) { &:not(.light *) }', '&:is(.dark *)']],
				overrides: { solid: { default: { bg: '700', dark: { bg: '400' } } } },
			});

			const page = await browser!.newPage({ colorScheme: 'dark' });
			await page.setContent(`<style>${built}</style>${html}`);
			await setMode(page, 'light');
			expect(await bg(page, 'root-solid')).toBe(await bg(page, 'gray-700'));
			expect(await bg(page, 'plain')).toBe(await bg(page, 'white'));
			await page.close();
		});
	});

	// #42: `apply-v` paints like `btn`, and a utility of `variantUtilities` like the variant on an element of that color.
	describe.each([
		['4', compile, (n: number) => `rgb(${n}, ${n}, ${n})`],
		['3', tailwind3(), (n: number) => `${n} ${n} ${n}`],
	] as const)('with `apply-v` and `variantUtilities` on Tailwind %s', (_, compileWith, rgb) => {
		// Each element, then the one it paints like
		const pairs = [
			['apply-v c-blue v-light', 'btn c-blue v-light'],
			['action c-blue v-light', 'btn c-blue v-light'],
			['apply-v-[bg,disabled] c-blue v-solid', 'apply-v-[bg] c-blue v-solid'],
			['bg-yellow', 'c-yellow v-solid bg-v'],
			['bg-amber', 'c-amber v-solid bg-v'],
			['text-yellow', 'c-yellow v-light text-v'],
			['border border-blue', 'c-blue v-outline border border-v'],
			['bg-primary', 'c-primary v-solid bg-v'],
		];
		// A state that no variant sets keeps the value at rest; the browser's own color of a disabled button is on both
		const disabled = ' disabled';
		const html = pairs.map(([el, ref], i) => `<button id="el-${i}" class="${el}"${i === 2 ? disabled : ''}>x</button><button id="ref-${i}" class="${ref}"${i === 2 ? disabled : ''}>x</button>`).join('')
			+ '<span id="yellow-600" class="c-yellow bg-c-600"></span>';

		let page: Page;
		// As painted pixels: `bg-v` gives a `color-mix()` in oklab, which serializes otherwise than the same color in oklch
		const colors = (id: string) => page.evaluate<string[]>(`(s => [s.backgroundColor, s.color, s.borderTopColor].map(c => {
			const x = document.createElement('canvas').getContext('2d');
			x.fillStyle = c;
			x.fillRect(0, 0, 1, 1);
			return x.getImageData(0, 0, 1, 1).data.join();
		}))(getComputedStyle(document.getElementById('${id}')))`);
		const expectPairs = async () => {
			for (const i of pairs.keys()) expect(await colors(`el-${i}`), pairs[i][0]).toEqual(await colors(`ref-${i}`));
		};

		beforeAll(async () => {
			const css = await compileWith(html.match(/[^\s"<>=]+/g)!, { darkMode: ['selector', '.dark'] }, {
				variantUtilities: { bg: 'solid', text: 'light', border: 'outline' },
				build: builder => builder
					.overrideVariant('solid', 'yellow', { bg: '700' })
					.overrideVariant('light', 'yellow', { fg: '700' })
					.addColor('primary', { vars: '--ui-color-primary', overrideVars: { variants: ['solid'] } }),
			}, '.action { @apply apply-v; }');

			page = await browser!.newPage();
			await page.setContent(`<style>:root { --ui-color-primary-600: ${rgb(1)}; } ${css}</style>${html}`);
		});

		afterAll(() => page.close());

		it.each(['light', 'dark'])('paints each pair alike in %s mode, at rest and on hover', async (mode) => {
			await page.evaluate(`document.documentElement.className = '${mode}'`);
			await expectPairs();

			for (const i of [0, 1]) {
				await page.hover(`#el-${i}`);
				const hovered = await colors(`el-${i}`);
				await page.hover(`#ref-${i}`);
				expect(hovered).toEqual(await colors(`ref-${i}`));
			}

			await page.mouse.move(0, 0);
			await page.evaluate(`document.documentElement.className = ''`);
		});

		it('follows the override and the variables of a palette given by them', async () => {
			expect((await colors('el-3'))[0]).not.toBe((await colors('yellow-600'))[0]);

			await page.evaluate(`document.documentElement.style.setProperty('--ui-color-primary-solid-bg', '${rgb(7)}')`);
			expect((await colors('el-7'))[0]).toBe('7,7,7,255');
			await expectPairs();
			await page.evaluate(`document.documentElement.removeAttribute('style')`);
		});
	});

	// #45: the browser bundle of the theme engine gives what it gives in Node
	it('runs the theme engine', async () => {
		const page = await browser!.newPage();
		await page.addScriptTag({ content: (await bundleEngine()).code });
		const options = { palettes: tailwind4 };
		const config = { overrides: { solid: { yellow: { bg: '700' } } } };

		expect(await page.evaluate(`WindiUITheme.createEngine(${JSON.stringify(config)}, ${JSON.stringify(options)}).resolve('solid', 'yellow')`))
			.toEqual(createEngine(config, options).resolve('solid', 'yellow'));
		expect(await page.evaluate(`WindiUITheme.createEngine().contrast('#fff', 'oklch(55.4% 0.135 66.442)')`)).toBeCloseTo(4.92, 2);
		await page.close();
	});
});
