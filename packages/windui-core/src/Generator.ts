import { cssEsc } from "./utils";
import type { ThemeProvider, CSS } from "./types";
import type { CSSVarName, VarsProvider } from "./varsProvider";
import { variants, type Variant } from "./variant";
import { sizes, type Size } from "./size";
import * as components from './components';
import type { ComponentBuilder, IComponent } from './components'

function cssVars<TKey extends string>(
	obj: Record<string, string | Record<string, string>>,
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

export class Generator {
	private readonly _variants: { [name: string]: Variant };
	private readonly _sizes: { [name: string]: Size };
	private readonly _components: { [name: string]: IComponent } = {};

	constructor(
		private readonly vars: VarsProvider,
		private readonly themeProvider: ThemeProvider
	) {
		this._variants = variants(vars);
		this._sizes = sizes(themeProvider);

		this.addComponent(components.buttons);
	}

	colorCssVars(name: string) {
		const color = this.themeProvider.colors(name);

		if (color) {
			switch (typeof color) {
				case 'string':
					return { [this.vars.c(name)]: color };
				case 'object':
					return cssVars(color, this.vars.c);
			}
		}

		return {};
	}

	colorRootVars(oneValue: string[]) {
		return Object.assign(
			Object.fromEntries(
				oneValue.map(cn => [this.vars.c(cn), this.themeProvider.colors(cn)])),
			this.colorCssVars('default')) as Record<CSSVarName<'c'>, string>;
	}

	getVariantNames() {
		return Object.keys(this._variants);
	}

	variantCssVars(name: string) {
		const variant = this._variants[name];

		if (variant) {
			return cssVars(variant, this.vars.v);
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
		const size = this._sizes[name];

		if (size) {
			return cssVars(size, this.vars.s);
		}
		return {};
	}

	sizeRootVars() {
		return this.sizeCssVars('default');
	}

	addComponent(cmp: ComponentBuilder) {
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

			console.log('applying variant', this.vars.variant('text'), css[cClass]);
			if (component.applyVariant) {
				this.themeProvider.applyTextColor(this.vars.variant('text'), css[cClass]);
				this.themeProvider.applyBackgroundColor(this.vars.variant('background'), css[cClass]);
				this.themeProvider.applyBorderColor(this.vars.variant('border'), css[cClass]);
			}

			if (component.applyVariantPseudos) {
				const pTarget = (nesting
					? css[cClass][`&:hover`] ??= {}
					: css[`${cClass}:hover`] ??= {}) as CSS.Properties;

				this.themeProvider.applyTextColor(this.vars.variant('text-hover'), pTarget);
				this.themeProvider.applyBackgroundColor(this.vars.variant('background-hover'), pTarget);
				this.themeProvider.applyBorderColor(this.vars.variant('border-hover'), pTarget);
			}
			console.log('applied variant', css[cClass]);

			return css;
		});
	}
}
