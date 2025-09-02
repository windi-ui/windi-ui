import { CSS } from '@/types';
import { default as button } from './button';
import { default as badge } from './badge';
import type { IComponent, ComponentBuilderContext } from './types';

export class ComponentsGenerator {
	private readonly components = new Map<string, IComponent>();

	constructor(public readonly context: ComponentBuilderContext) {
		[button(context), badge(context)].forEach((component) => {
			this.components.set(component.name, component);
		});
	}

	*css() {
		for (const [cName, component] of this.components) {
			const cClass = `.${cName}`;
			const css: CSS.Rules = { [cClass]: { ...component.style } };

			if (component.pseudos) {
				for (const pseudo in component.pseudos) {
					css[cClass][`&${pseudo}`] = component.pseudos[pseudo];
				}
			}

			if (component.applyVariant || component.applyVariantPseudos) {
				this.context.variants.apply(component.applyVariant, component.applyVariantPseudos, css[cClass]);
			}

			yield css;
		}
	}
}
