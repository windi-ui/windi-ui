import * as CSS from 'csstype';
import IThemeProvider from './IThemeProvider';
import { Expand } from './Utilities';

export type ComponentBuilder = (theme: IThemeProvider) => IComponent;

export interface IComponent {
	name: string,
	style: CSS.Properties,
	pseudos?: Expand<Partial<Record<CSS.Pseudos, CSS.Properties>>, string, CSS.Properties>
}