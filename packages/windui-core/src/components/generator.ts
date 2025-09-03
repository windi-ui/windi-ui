import type { CSS } from '@/types';
import type { IComponent, ComponentBuilderContext } from './types';
import { BuilderBase } from '@/base';
import { default as button } from './button';
import { default as badge } from './badge';

export class ComponentsGenerator extends BuilderBase<IComponent, ComponentBuilderContext> {
	protected readonly items = new Map<string, IComponent>();

	constructor(context: ComponentBuilderContext) {
		super(context);
		[button(context), badge(context)].forEach((component) => {
			this.items.set(component.name, component);
		});
	}

	*css() {
		for (const [cName, component] of this.items) {
			const cClass = `.${cName}`;
			const css: CSS.Rules = { [cClass]: { ...component.style } };

			if (component.pseudos) {
				for (const pseudo in component.pseudos) {
					css[cClass][`&${pseudo}`] = component.pseudos[pseudo];
				}
			}

			if (component.applyVariant || component.applyVariantPseudos) {
				this.ctx.variants.apply(component.applyVariant, component.applyVariantPseudos, css[cClass]);
			}

			yield css;
		}
	}
}
