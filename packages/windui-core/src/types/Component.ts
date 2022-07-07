import type { Expand, CSS } from './';
import type Utilities from '@/Utilities';

declare module 'csstype' {
	interface Properties {
		[key: string]: string | number | Properties;
	}

	interface Rules {
		[selector: string]: Properties;
	}
}

export type ComponentBuilder = (utilities: Utilities) => IComponent;

export interface IComponent {
	name: string,
	style: CSS.Properties,
	pseudos?: Expand<Partial<Record<CSS.Pseudos, CSS.Properties>>, string, CSS.Properties>
}