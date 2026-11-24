import { cases } from './cases';
import { baseline } from './baseline';
import { forms } from './forms';
import { tailwind4 } from './helpers';

const compile = tailwind4('tw4');

baseline('tw4', compile);
cases(compile);
forms(compile);
