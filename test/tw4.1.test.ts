import { cases } from './cases';
import { autoDark, darkSelector } from './dark';
import { baseline } from './baseline';
import { forms } from './forms';
import { tailwind4 } from './helpers';

const compile = tailwind4('tw4.1');

baseline('tw4.1', compile);
cases(compile);
forms(compile);
darkSelector(compile);
autoDark(compile);
