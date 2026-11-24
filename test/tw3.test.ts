import { expect, it } from 'vitest';
import { cases } from './cases';
import { darkSelector } from './dark';
import { baseline, candidates } from './baseline';
import { tailwind3 } from './helpers';

const compile = tailwind3();

baseline('tw3', compile);
cases(compile);
darkSelector(compile);

// #33
it('builds the same from the `/v3` entry', async () => {
	expect(await tailwind3('@windi-ui/tailwind/v3')(candidates)).toBe(await compile(candidates));
});
