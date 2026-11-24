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

	const painted = (page: Page) => page.evaluate<string>(`JSON.stringify([...document.querySelectorAll('[id]')].map(e => {
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

	afterAll(() => browser?.close());

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
		it('gives a child of an `@apply v-* v-scope` host the default variant', async () => {
			const page = pages.element;
			expect(await style(page, 'applied', 'backgroundColor')).toBe(await style(page, 'plain', 'backgroundColor'));
			expect(await style(page, 'applied', 'backgroundColor')).not.toBe(await style(page, 'card', 'backgroundColor'));
		});

		it.each(['light', 'dark'] as const)('paints like the universal scope in %s mode', async (colorScheme) => {
			for (const page of [pages.universal, pages.element]) {
				await page.evaluate(`document.documentElement.className = '${colorScheme}'`);
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

	it.todo('keeps an override through hover');
	it.todo('lets a hand-written compound rule win from each cascade layer');
});
