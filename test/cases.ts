import { expect, it, vi } from 'vitest';
import type { Compile } from './helpers';

/** Cases that hold on every supported Tailwind version; each fixture's test file runs them. */
export function cases(compile: Compile) {
	// #30: the callbacks stay reachable for arbitrary values, and answer the unknown ones with nothing.
	it('emits and logs nothing for unknown arbitrary values', async () => {
		const logs = (['log', 'warn', 'error'] as const).map(m => vi.spyOn(console, m).mockImplementation(() => {}));

		expect(await compile(['hidden', 'c-[foo]', 'v-[foo]', 's-[foo]'])).toBe(await compile(['hidden']));
		for (const log of logs) expect(log).not.toHaveBeenCalled();

		vi.restoreAllMocks();
	});
}
