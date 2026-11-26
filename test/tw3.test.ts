import { applyV } from './apply';
import { expect, it } from 'vitest';
import { cases } from './cases';
import { builderColors, colorsOnly, palettes } from './colors';
import { darkClass, darkOptOut, darkSelector } from './dark';
import { baseline, candidates } from './baseline';
import { tailwind3 } from './helpers';
import { tailwind3 as palettes3 } from '../packages/windiui-tailwind/dist/palettes.mjs';
import { manifest } from './manifest';
import { overrides } from './overrides';
import { presets } from './presets';
import { readmeSamples } from './readme';
import { safelist, source } from './safelist';
import { states } from './states';

const compile = tailwind3();

baseline('tw3', compile);
cases(compile);
overrides(compile);
applyV(compile);
states(compile);
presets(compile);
palettes(compile);
builderColors(compile);
colorsOnly(compile);
source();
safelist(compile);
manifest(compile, palettes3);
darkSelector(compile);
darkOptOut(compile);
darkClass(compile);
readmeSamples(compile);

// #33
it('builds the same from the `/v3` entry', async () => {
	expect(await tailwind3('@windi-ui/tailwind/v3')(candidates)).toBe(await compile(candidates));
});
