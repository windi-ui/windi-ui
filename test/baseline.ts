import { expect, it } from 'vitest';
import type { Compile } from './helpers';

export const candidates = [
	// color scopes
	'c-red', 'c-accent-indigo',
	// variants
	'v-default', 'v-solid', 'v-outline', 'v-light',
	// sizes
	's-xs', 's-sm', 's-md', 's-lg', 's-xl',
	// variant utilities: levels, then opacity modifiers
	'bg-v', 'bg-v-soft', 'bg-v-muted', 'bg-v-accent', 'text-v', 'text-v-soft', 'border-v', 'border-v-muted',
	'bg-v/50', 'bg-v-soft/60', 'bg-v/[0.3]', 'text-v/75', 'border-v/30',
	// under Tailwind's own variants
	'hover:bg-v-soft', 'before:bg-v', 'placeholder:text-v', 'dark:v-solid',
	// theme colors
	'bg-c-500', 'text-c-700/50', 'border-c-300', 'bg-default-100', 'text-accent-600',
	// components
	'btn', 'badge',
	// arbitrary values, which the variant utilities also match today (#30)
	'bg-[#123456]', 'text-[14px]', 'text-[red]', 'border-[3px]',
];

/** The output of a default setup, kept as a CSS file so that a change in it shows up as a reviewable diff. */
export function baseline(name: string, compile: Compile) {
	it('matches the baseline', async () => {
		await expect(await compile(candidates)).toMatchFileSnapshot(`./__snapshots__/${name}/baseline.css`);
	});
}
