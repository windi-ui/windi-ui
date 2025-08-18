import type { ThemeProvider, CSS } from "./types";
import { cssVars, type VarsProvider, type CSSValues } from "./vars";
import { colorsProvider, type ColorProvider } from "./colors";
import { variantsProvider, type VariantProvider } from "./variants";
import { sizes, type Size } from "./size";
import * as components from './components';

export class Generator {
	private readonly _sizes: Record<string, Size>;
	private readonly _components: Record<string, components.IComponent> = {};
	readonly colors: ColorProvider;
	readonly variants: VariantProvider;

	constructor(
		readonly vars: VarsProvider,
		readonly theme: ThemeProvider
	) {
		this.colors = colorsProvider(this.vars, this.theme);
		this.variants = variantsProvider(this.vars, this.theme);
		this._sizes = sizes(theme);

		this.addComponent(components.button)
			.addComponent(components.badge);
	}

	getSizeNames() {
		return Object.keys(this._sizes);
	}

	sizeCssVars(name: string) {
		const size = { ...this._sizes[name] };
		const rSize = size as CSSValues;
		const sText = size.text;
		if (Array.isArray(sText)) {
			rSize.text = sText[0];
			rSize['line-height'] = sText[1].lineHeight;
		}

		if (size) {
			return cssVars(rSize, n => this.vars.s(n));
		}
		return {};
	}

	sizeRootVars() {
		return this.sizeCssVars('default');
	}

	addComponent(cmp: components.ComponentBuilder) {
		const component = cmp(this.vars, this.theme);
		this._components[component.name] = component;
		return this;
	}

	getComponentsCss(nesting = true) {
		return Object.entries(this._components).map(([cName, component]) => {
			const cClass = `.${cName}`;
			const css: CSS.Rules = { [cClass]: { ...component.style } };

			if (component.pseudos) {
				for (const pseudo in component.pseudos) {
					if (nesting) {
						css[cClass][`&${pseudo}`] = component.pseudos[pseudo];
					} else {
						css[`${cClass}${pseudo}`] = component.pseudos[pseudo];
					}
				}
			}

			if (component.applyVariant || component.applyVariantPseudos) {
				this.variants.apply(component.applyVariant, component.applyVariantPseudos, css[cClass]);
			}

			return css;
		});
	}
}
