import { cases } from './cases';
import { baseline } from './baseline';
import { tailwind4 } from './helpers';

const compile = tailwind4('tw4.1');

baseline('tw4.1', compile);
cases(compile);
