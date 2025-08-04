import { cssEsc } from "./utils";
import type { ThemeProvider, CSS } from "./types";
import type { CSSVarName, VarsProvider } from "./vars";
import { variants, type Variant } from "./variant";
import { sizes, type Size } from "./size";
import * as components from './components';

type CssValues = Record<string, string | Record<string, string>>

function cssVars<TKey extends string>(
	obj: CssValues,
	keyMap: (p: string) => TKey,
	vars: Record<string, string> = {}): Record<TKey, string> {
	for (const p in obj) {
		const val = obj[p];
		if (typeof val === 'string') {
			vars[cssEsc(keyMap(p))] = val;
		} else {
			cssVars(val, (cp) => `${keyMap(p)}-${cp}`, vars);
		}
	}
	return vars;
}

const FLAT_COLORS = {
	transparent: 'transparent',
	black: '#000',
	white: '#fff',
};

export class Generator {
	private readonly _variants: Record<string, Variant>;
	private readonly _sizes: Record<string, Size>;
	private readonly _components: Record<string, components.IComponent> = {};

	constructor(
		private readonly vars: VarsProvider,
		private readonly themeProvider: ThemeProvider
	) {
		this._variants = variants(vars);
		this._sizes = sizes(themeProvider);

		this.addComponent(components.button)
			.addComponent(components.badge);
	}

	colorCssVars(name: string) {
		const color = this.themeProvider.colors(name);

		if (color) {
			switch (typeof color) {
				case 'string':
					return { [this.vars.c(name)]: color };
				case 'object':
					return cssVars(color, n => this.vars.c(n));
			}
		}

		return {};
	}

	colorRootVars() {
		const cRoot: Record<CSSVarName<'c'>, string> = {};
		for (const mn in FLAT_COLORS) {
			const mc = this.themeProvider.colors(mn);
			cRoot[this.vars.c(mn)] = (typeof mc === 'string') ? mc : FLAT_COLORS[mn as keyof typeof FLAT_COLORS];
		}
		return Object.assign(cRoot, this.colorCssVars('default'));
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
		const size = { ... this._sizes[name] } as CssValues;
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
		const component = cmp(this.vars, this.themeProvider);
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
					this.themeProvider.applyTextColor(this.vars.variant('text'), css[cClass]);
				}
				if (component.applyVariant === true || component.applyVariant.includes('background')) {
					this.themeProvider.applyBackgroundColor(this.vars.variant('background'), css[cClass]);
				}
				if (component.applyVariant === true || component.applyVariant.includes('border')) {
					this.themeProvider.applyBorderColor(this.vars.variant('border'), css[cClass]);
				}
			}

			if (component.applyVariantPseudos) {
				const pTarget = (nesting
					? css[cClass][`&:hover`] ??= {}
					: css[`${cClass}:hover`] ??= {}) as CSS.Properties;

				this.themeProvider.applyTextColor(this.vars.variant('text-hover'), pTarget);
				this.themeProvider.applyBackgroundColor(this.vars.variant('background-hover'), pTarget);
				this.themeProvider.applyBorderColor(this.vars.variant('border-hover'), pTarget);
			}

			return css;
		});
	}
}
