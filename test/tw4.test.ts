import { cases } from './cases';
import { builderColors, palettes, palettesCss, rootSelectorCss } from './colors';
import { autoDark, darkSelector } from './dark';
import { baseline } from './baseline';
import { forms } from './forms';
import { tailwind4 } from './helpers';

const compile = tailwind4('tw4');

baseline('tw4', compile);
cases(compile);
palettes(compile);
palettesCss(compile);
builderColors(compile);
rootSelectorCss(compile);
forms(compile);
darkSelector(compile);
autoDark(compile);
