import { cases } from './cases';
import { baseline } from './baseline';
import { tailwind3 } from './helpers';

const compile = tailwind3();

baseline('tw3', compile);
cases(compile);
