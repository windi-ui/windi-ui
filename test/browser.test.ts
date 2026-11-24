import { chromium, type Page } from 'playwright-core';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { tailwind4 } from './helpers';

// What a snapshot cannot prove: how the emitted CSS cascades and inherits in a real browser.
// It drives an installed Chrome or Edge, so there is no browser download.

const html = `
	<div id="host" class="c-red v-solid bg-v text-v before:bg-v">
		<span id="child" class="bg-v"></span>
	</div>
	<input id="input" class="c-red v-solid placeholder:text-v" placeholder="placeholder">
	<span id="plain" class="bg-v text-v"></span>
`;

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
	let page: Page;

	// A string, because this project is not typed for the DOM.
	const style = (id: string, property: 'backgroundColor' | 'color', pseudo = '') => page.evaluate<string>(
		`getComputedStyle(document.getElementById('${id}'), '${pseudo}').${property}`
	);

	beforeAll(async () => {
		const css = await compile(html.match(/[^\s"<>=]+/g)!);
		page = await browser!.newPage();
		await page.setContent(`<style>${css}</style>${html}`);
	});

	afterAll(() => browser?.close());

	it('gives a child of a variant host the default variant', async () => {
		expect(await style('child', 'backgroundColor')).toBe(await style('plain', 'backgroundColor'));
		expect(await style('child', 'backgroundColor')).not.toBe(await style('host', 'backgroundColor'));
	});

	it('keeps the host variant in ::before', async () => {
		expect(await style('host', 'backgroundColor', '::before')).toBe(await style('host', 'backgroundColor'));
	});

	it('keeps the host variant in ::placeholder', async () => {
		expect(await style('input', 'color', '::placeholder')).toBe(await style('host', 'color'));
		expect(await style('input', 'color', '::placeholder')).not.toBe(await style('plain', 'color'));
	});

	it.todo('keeps an override through hover');
	it.todo('lets a hand-written compound rule win from each cascade layer');
});
