import { applyV } from './apply';
import { cases } from './cases';
import { builderColors, colorsOnly, colorsOnlyCss, palettes, palettesCss, rootSelectorCss } from './colors';
import { autoDark, darkSelector } from './dark';
import { baseline } from './baseline';
import { forms } from './forms';
import { tailwind4 } from './helpers';
import { overrides } from './overrides';
import { presets, presetsCss } from './presets';
import { readmeSamples } from './readme';
import { safelistSourceCss } from './safelist';

const compile = tailwind4('tw4.1');

baseline('tw4.1', compile);
cases(compile);
overrides(compile);
applyV(compile);
presets(compile);
presetsCss(compile);
palettes(compile);
palettesCss(compile);
builderColors(compile);
rootSelectorCss(compile);
colorsOnly(compile);
colorsOnlyCss(compile);
// Tailwind 4.1 has no mauve, olive, mist and taupe.
safelistSourceCss(compile, {
	palettes: [
		'slate', 'gray', 'zinc', 'neutral', 'stone', 'red', 'orange', 'amber', 'yellow', 'lime', 'green', 'emerald',
		'teal', 'cyan', 'sky', 'blue', 'indigo', 'violet', 'purple', 'fuchsia', 'pink', 'rose',
	],
});
forms(compile);
darkSelector(compile);
readmeSamples(compile);
// The fixture is below 4.1.17.
autoDark(compile, false);
