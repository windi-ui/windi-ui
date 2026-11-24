import { cases } from './cases';
import { builderColors, palettes, palettesCss, rootSelectorCss } from './colors';
import { autoDark, darkSelector } from './dark';
import { baseline } from './baseline';
import { forms } from './forms';
import { tailwind4 } from './helpers';
import { safelistSourceCss } from './safelist';

const compile = tailwind4('tw4.1');

baseline('tw4.1', compile);
cases(compile);
palettes(compile);
palettesCss(compile);
builderColors(compile);
rootSelectorCss(compile);
// Tailwind 4.1 has no mauve, olive, mist and taupe.
safelistSourceCss(compile, {
	palettes: [
		'slate', 'gray', 'zinc', 'neutral', 'stone', 'red', 'orange', 'amber', 'yellow', 'lime', 'green', 'emerald',
		'teal', 'cyan', 'sky', 'blue', 'indigo', 'violet', 'purple', 'fuchsia', 'pink', 'rose',
	],
});
forms(compile);
darkSelector(compile);
autoDark(compile);
