import { chromium, type Page } from 'playwright-core';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { tailwind4 } from './helpers';

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

const compile = tailwind4('tw4');
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

	// Both blocked upstream: Tailwind v4 puts `addComponents` CSS in the utilities layer, so `.btn:hover` beats a plain
	// utility, and a rule in `@layer base` or `components` loses to `.btn`
	// (https://github.com/tailwindlabs/tailwindcss/issues/15045). The guide documents the workarounds.
	it.todo('keeps an override through hover');
	it.todo('lets a hand-written compound rule win from each cascade layer');
});
