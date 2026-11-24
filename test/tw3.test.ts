import { expect, it } from 'vitest';
import { cases } from './cases';
import { builderColors, palettes } from './colors';
import { darkClass, darkSelector } from './dark';
import { baseline, candidates } from './baseline';
import { tailwind3 } from './helpers';
import { safelist, source } from './safelist';

const compile = tailwind3();

baseline('tw3', compile);
cases(compile);
palettes(compile);
builderColors(compile);
source();
safelist(compile);
darkSelector(compile);
darkClass(compile);

// #33
it('builds the same from the `/v3` entry', async () => {
	expect(await tailwind3('@windi-ui/tailwind/v3')(candidates)).toBe(await compile(candidates));
});
