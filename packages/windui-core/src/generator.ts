import type { ThemeProvider, CSS } from "./types";
import { cssVars, type VarsProvider, type CSSValues } from "./vars";
import { colorsProvider, type ColorProvider } from "./colors";
import { variants, type Variant } from "./variant";
import { sizes, type Size } from "./size";
import * as components from './components';

export class Generator {
	private readonly _variants: Record<string, Variant>;
	private readonly _sizes: Record<string, Size>;
	private readonly _components: Record<string, components.IComponent> = {};
	readonly colors: ColorProvider;

	constructor(
		readonly vars: VarsProvider,
		readonly theme: ThemeProvider
	) {
		this.colors = colorsProvider(this.theme.colors(), this.vars);
		this._variants = variants(vars);
		this._sizes = sizes(theme);

		this.addComponent(components.button)
			.addComponent(components.badge);
	}


	getVariantNames() {
		return Object.keys(this._variants);
	}

	variantCssVars(name: string) {
		const variant = this._variants[name];

		if (variant) {
			return cssVars(variant, n => this.vars.v(n));
		}
		return {};
	}

	variantRootVars() {
		return this.variantCssVars('default');
	}

	getSizeNames() {
		return Object.keys(this._sizes);
	}

	sizeCssVars(name: string) {
		const size = { ... this._sizes[name] } as CSSValues;
		const sText = size.text;
		if (Array.isArray(sText)) {
			size.text = sText[0];
			size['line-height'] = sText[1].lineHeight;
		}

		if (size) {
			return cssVars(size, n => this.vars.s(n));
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

			if (component.applyVariant) {
				if (component.applyVariant === true || component.applyVariant.includes('text')) {
					this.theme.applyTextColor(this.vars.variant('text'), css[cClass]);
				}
				if (component.applyVariant === true || component.applyVariant.includes('background')) {
					this.theme.applyBackgroundColor(this.vars.variant('background'), css[cClass]);
				}
				if (component.applyVariant === true || component.applyVariant.includes('border')) {
					this.theme.applyBorderColor(this.vars.variant('border'), css[cClass]);
				}
			}

			if (component.applyVariantPseudos) {
				const pTarget = (nesting
					? css[cClass][`&:hover`] ??= {}
					: css[`${cClass}:hover`] ??= {}) as CSS.Properties;

				this.theme.applyTextColor(this.vars.variant('text-hover'), pTarget);
				this.theme.applyBackgroundColor(this.vars.variant('background-hover'), pTarget);
				this.theme.applyBorderColor(this.vars.variant('border-hover'), pTarget);
			}

			return css;
		});
	}
}
