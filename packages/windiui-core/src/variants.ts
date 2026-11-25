import type { CSS } from "./types";
import { type VarsProvider, type CSSVarName, type CSSVarValue, type CSSValues, cssVars } from "./vars";
import { type BuilderContext, VarsGeneratorBase } from "./base";
import type { VariantScope } from "./config";

export type VariantVars = Record<CSSVarName<'v'>, string>;
export type VariantPropValue = CSSVarValue<'c'> | CSSVarValue<'v'>;
export type OpacityValue = '1' | '0' | `0.${number}`;

export interface VariantProperties {
	'bg': VariantPropValue;
	'bg-soft'?: VariantPropValue;
	'bg-muted'?: VariantPropValue;
	'bg-accent'?: VariantPropValue;
	'bg-opacity'?: OpacityValue;

	'border': VariantPropValue;
	'border-soft'?: VariantPropValue;
	'border-muted'?: VariantPropValue;
	'border-accent'?: VariantPropValue;
	'border-opacity'?: OpacityValue;

	'fg': VariantPropValue;
	'fg-soft'?: VariantPropValue;
	'fg-muted'?: VariantPropValue;
	'fg-accent'?: VariantPropValue;
	'fg-opacity'?: OpacityValue;
}

type VariantPseudos = Partial<Record<CSS.SimplePseudos, Partial<VariantProperties>>>;
export interface Variant extends VariantProperties {
	pseudos?: VariantPseudos;
	dark?: Omit<Partial<Variant>, 'dark'>;
}

export type VariantProperty = keyof VariantProperties | `${keyof VariantProperties}-${CSS.SimplePseudos}`;
export type ApplyVariantMainProp = 'bg' | 'border' | 'text';
export type ApplyVariantSubProp = 'soft' | 'muted' | 'accent' | 'default';
export type ApplyVariantProp = ApplyVariantMainProp | `${ApplyVariantMainProp}-${Exclude<ApplyVariantSubProp, 'default'>}`;

export type ApplyVariant = boolean | ApplyVariantProp[];
export type ApplyVariantPseudos = Partial<Record<CSS.SimplePseudos, ApplyVariant>> | CSS.SimplePseudos[] | false;

export interface VariantCssVars extends VariantVars {
	'@dark'?: VariantVars;
}

export interface VariantContext {
	apply(
		v?: ApplyVariant,
		pseudos?: ApplyVariantPseudos,
		target?: CSS.Properties
	): CSS.Properties;

	/**
	 * Outside the `universal` scope, gives every bare `var()` read of a variant variable in `css` the default
	 * variant's value, light or dark, as its fallback.
	 */
	withFallback<T extends CSS.Properties>(css: T): T;
}

export function defaultVariant(vars: VarsProvider): Variant {
	return {
		'bg': vars.color('white'),
		'bg-soft': vars.color('100'),
		'bg-muted': vars.color('200'),
		'bg-accent': vars.color.accent('100'),
		'bg-opacity': '1',

		'border': vars.color('500'),
		'border-soft': vars.color('400'),
		'border-muted': vars.color('300'),
		'border-accent': vars.color.accent('500'),
		'border-opacity': '1',

		'fg': vars.color('800'),
		'fg-soft': vars.color('500'),
		'fg-muted': vars.color('400'),
		'fg-accent': vars.color.accent('700'),
		'fg-opacity': '1',

		pseudos: {
			':hover': {
				'bg': vars.color('100'),
				'bg-soft': vars.color('200'),
				'bg-muted': vars.color('300'),
				'bg-accent': vars.color.accent('200'),
			}
		},

		dark: {
			'bg': vars.color('950'),
			'bg-soft': vars.color('900'),
			'bg-muted': vars.color('800'),
			'bg-accent': vars.color.accent('900'),

			'border': vars.color('700'),
			'border-soft': vars.color('600'),
			'border-muted': vars.color('500'),
			'border-accent': vars.color.accent('700'),

			'fg': vars.color('200'),
			'fg-soft': vars.color('300'),
			'fg-muted': vars.color('400'),
			'fg-accent': vars.color.accent('200'),

			'pseudos': {
				':hover': {
					'bg': vars.color('900'),
					'bg-soft': vars.color('800'),
					'bg-muted': vars.color('700'),
					'bg-accent': vars.color.accent('900'),
				}
			}
		}
	};
}

export function mainVariants(vars: VarsProvider): Record<string, Variant> {
	return {
		solid: {
			'bg': vars.color('600'),
			'bg-soft': vars.color('500'),
			'bg-muted': vars.color('400'),
			'bg-accent': vars.color.accent('600'),
			'bg-opacity': '1',

			'border': vars.color('600'),
			'border-soft': vars.color('500'),
			'border-muted': vars.color('400'),
			'border-accent': vars.color.accent('600'),
			'border-opacity': '0',

			'fg': vars.color('white'),
			'fg-soft': vars.color('200'),
			'fg-muted': vars.color('300'),
			'fg-accent': vars.color.accent('200'),
			'fg-opacity': '1',

			pseudos: {
				':hover': {
					'bg': vars.color('700'),
					'bg-soft': vars.color('600'),
					'bg-muted': vars.color('500'),
					'bg-accent': vars.color.accent('700'),

					'border': vars.color('700'),
					'border-soft': vars.color('600'),
					'border-muted': vars.color('500'),
					'border-accent': vars.color.accent('700'),

					'fg': vars.color('50'),
				}
			}
		},
		outline: {
			'bg': vars.color('white'),
			'bg-soft': vars.color('white'),
			'bg-muted': vars.color('white'),
			'bg-accent': vars.color('white'),
			'bg-opacity': '0',

			'border': vars.color('600'),
			'border-soft': vars.color('500'),
			'border-muted': vars.color('400'),
			'border-accent': vars.color.accent('600'),
			'border-opacity': '1',

			'fg': vars.color('600'),
			'fg-soft': vars.color('500'),
			'fg-muted': vars.color('400'),
			'fg-accent': vars.color.accent('600'),
			'fg-opacity': '1',

			pseudos: {
				':hover': {
					'bg': vars.color('100'),
					'bg-soft': vars.color('100'),
					'bg-muted': vars.color('100'),
					'bg-accent': vars.color.accent('100'),
					'bg-opacity': '0.75',
				}
			},

			dark: {
				'border': vars.color('400'),
				'border-soft': vars.color('500'),
				'border-muted': vars.color('600'),
				'border-accent': vars.color.accent('400'),

				'fg': vars.color('400'),
				'fg-soft': vars.color('500'),
				'fg-muted': vars.color('600'),
				'fg-accent': vars.color.accent('400'),

				pseudos: {
					':hover': {
						'bg': vars.color('900'),
						'bg-soft': vars.color('900'),
						'bg-muted': vars.color('900'),
						'bg-accent': vars.color.accent('900'),
						'bg-opacity': '0.50',
					}
				},
			}
		},
		light: {
			'bg': vars.color('100'),
			'bg-soft': vars.color('200'),
			'bg-muted': vars.color('300'),
			'bg-accent': vars.color.accent('100'),
			'bg-opacity': '1',

			'border': vars.color('100'),
			'border-soft': vars.color('200'),
			'border-muted': vars.color('300'),
			'border-accent': vars.color.accent('100'),
			'border-opacity': '0',

			'fg': vars.color('600'),
			'fg-soft': vars.color('500'),
			'fg-muted': vars.color('400'),
			'fg-accent': vars.color.accent('600'),
			'fg-opacity': '1',

			pseudos: {
				':hover': {
					'bg': vars.color('600'),
					'bg-soft': vars.color('500'),
					'bg-muted': vars.color('400'),
					'bg-accent': vars.color.accent('600'),

					'border': vars.color('600'),
					'border-soft': vars.color('500'),
					'border-muted': vars.color('400'),
					'border-accent': vars.color.accent('600'),

					'fg': vars.color('50'),
					'fg-soft': vars.color('100'),
					'fg-muted': vars.color('200'),
					'fg-accent': vars.color.accent('50'),
				}
			},

			dark: {
				'bg': vars.color('900'),
				'bg-soft': vars.color('700'),
				'bg-muted': vars.color('600'),
				'bg-accent': vars.color.accent('900'),
				'bg-opacity': '0.5',

				'border': vars.color('900'),
				'border-soft': vars.color('700'),
				'border-muted': vars.color('600'),
				'border-accent': vars.color.accent('900'),

				'fg': vars.color('300'),
				'fg-soft': vars.color('400'),
				'fg-muted': vars.color('500'),
				'fg-accent': vars.color.accent('300'),

				pseudos: {
					':hover': {
						'bg': vars.color('600'),
						'bg-soft': vars.color('500'),
						'bg-muted': vars.color('400'),
						'bg-accent': vars.color.accent('600'),
						'bg-opacity': '1',

						'border': vars.color('600'),
						'border-soft': vars.color('500'),
						'border-muted': vars.color('400'),
						'border-accent': vars.color.accent('600'),

						'fg': vars.color('50'),
					}
				}
			}
		}
	};
}

function getCssVars(vars: VarsProvider, props: Omit<Partial<Variant>, 'dark'>) {
	const { pseudos: vPseudos, ...vProps } = props;
	const cssObj = vProps as CSSValues;

	if (vPseudos) {
		const propKeys = Object.keys(vProps) as (keyof VariantProperties)[];
		for (const vpk in vPseudos) {
			const vp = vPseudos[vpk as CSS.SimplePseudos];
			if (vp) {
				const vpPropKeys = new Set([...Object.keys(vp) as (keyof VariantProperties)[], ...propKeys]);
				for (const vppk of vpPropKeys) {
					// A reference, not a copy: it resolves on the element, so a dark block or an override of the base value reaches the state
					cssObj[`${vppk}-${vpk}`] = vp[vppk] ?? vars.variant(vppk);
				}
			}
		}
	}

	return cssVars(cssObj, n => vars.v(n));
}

/** The light values of the built-in default variant, by CSS variable name. */
export function defaultVariantVars(vars: VarsProvider): VariantVars {
	const { dark: _, ...props } = defaultVariant(vars);
	const light = getCssVars(vars, props);

	// A state value that refers to its base value needs the base value as its own fallback
	for (const [name, value] of Object.entries(light)) {
		const base = /^var\((--[^,()\s]+)\)$/.exec(value)?.[1];
		if (base && base in light) {
			light[name as CSSVarName<'v'>] = `var(${base}, ${light[base as CSSVarName<'v'>]})`;
		}
	}

	return light;
}

export class VariantsGenerator extends VarsGeneratorBase<Variant, VariantCssVars> implements VariantContext {
	protected readonly items: Map<string, Variant>;

	constructor(ctx: BuilderContext, private readonly scope: VariantScope = 'universal') {
		super(ctx);
		this.items = new Map([
			['default', defaultVariant(this.vars)],
			...Object.entries(mainVariants(this.vars))
		]);
	}

	cssVars(name: string): VariantCssVars {
		const variant = this.items.get(name);
		if (!variant) {
			console.error(`Variant "${name}" not found.`);
			return {};
		}

		const { dark: vDark, ...vProps } = variant;
		const cssVars: VariantCssVars = getCssVars(this.vars, vProps);
		if (vDark) {
			cssVars['@dark'] = getCssVars(this.vars, vDark);
		}

		return cssVars;
	}

	/** Every variable a variant can set, as `initial`: on a child it stops the parent's variant from inheriting. */
	resetVars(): VariantVars {
		const reset: VariantVars = {};
		for (const name of this.items.keys()) {
			const { '@dark': dark, ...light } = this.cssVars(name);
			for (const v of Object.keys({ ...light, ...dark })) {
				reset[v as CSSVarName<'v'>] = 'initial';
			}
		}

		return reset;
	}

	utilCss(v: ApplyVariantMainProp, prop?: ApplyVariantSubProp, alpha?: string) {
		return this.withFallback(this.vApplyProp(v, prop, {}, undefined, alpha));
	}

	/**
	 * The two switches a fallback picks its light or dark value with: `var(on-light, <light>) var(on-dark, <dark>)`.
	 * The one of the current mode is not set, so its fallback is used, and the other one is empty.
	 * They inherit, so a pseudo-element is in the mode of its element, which a dark selector nested in its rule cannot tell.
	 */
	modeVars(): { light: VariantVars, dark: VariantVars } {
		// Computes to an empty value, and unlike a declaration without a value no minifier drops it
		const empty = `var(${this.vars.v('nil')},)`;

		return {
			light: { [this.vars.v('on-dark')]: empty },
			dark: { [this.vars.v('on-light')]: empty, [this.vars.v('on-dark')]: 'initial' },
		};
	}

	withFallback<T extends CSS.Properties>(css: T): T {
		if (this.scope === 'universal')
			return css;

		const { '@dark': dark = {}, ...light } = this.cssVars('default');
		const bareRead = new RegExp(`var\\((${this.vars.v('').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^,()\\s]+)\\)`, 'g');

		// `seen` stops at a default variant whose values refer to each other in a circle
		const resolve = (value: string, seen: string[] = []): string => value.replace(bareRead, (read, name: CSSVarName<'v'>) => {
			if (!(name in light) || seen.includes(name))
				return read;

			const onLight = resolve(light[name], [...seen, name]);
			const onDark = resolve(dark[name] ?? light[name], [...seen, name]);
			return onLight === onDark
				? `var(${name}, ${onLight})`
				: `var(${name}, ${this.vars.variant('on-light' as VariantProperty, onLight)} ${this.vars.variant('on-dark' as VariantProperty, onDark)})`;
		});

		const addFallback = (rule: CSS.Properties): CSS.Properties => Object.fromEntries(Object.entries(rule).map(([prop, value]) => [
			prop,
			typeof value === 'string' ? resolve(value) : typeof value === 'object' ? addFallback(value) : value
		]));

		return addFallback(css) as T;
	}

	apply(v: ApplyVariant = true, pseudos?: ApplyVariantPseudos, target: CSS.Properties = {}) {
		const appl = (pV: ApplyVariant, pTarget: CSS.Properties, pseudo?: CSS.SimplePseudos) => {
			if (pV === false)
				return pTarget;
			if (pV === true)
				pV = ['bg', 'border', 'text'];

			const aV = pV;
			const applProp = (mProp: ApplyVariantMainProp) => {
				const vP = aV.find(p => p.startsWith(mProp));
				if (!vP) return;

				const sProp = vP.replace(new RegExp(`^${mProp}-?`), '') as ApplyVariantSubProp;
				this.vApplyProp(mProp, sProp, pTarget, pseudo);
			};

			applProp('bg');
			applProp('border');
			applProp('text');

			return pTarget;
		};

		if (v) {
			appl(v, target);
		}

		if (pseudos) {
			if (Array.isArray(pseudos)) {
				pseudos = pseudos.reduce((acc, p) => {
					acc[p] = true;
					return acc;
				}, {} as Record<CSS.SimplePseudos, ApplyVariant>);
			}

			for (const pseudo in pseudos) {
				const pV = pseudos[pseudo as CSS.SimplePseudos];
				if (pV) {
					const pTarget = (target[`&${pseudo}`] ??= {}) as CSS.Properties;
					appl(pV, pTarget, pseudo as CSS.SimplePseudos);
				}
			}
		}

		return target;
	}

	private vApplyProp(mProp: ApplyVariantMainProp, sProp?: ApplyVariantSubProp, target: CSS.Properties = {}, pseudo?: CSS.SimplePseudos, alpha?: string) {
		const mvp = mProp === 'text' ? 'fg' : mProp;
		const vp = (sProp && sProp !== 'default') ? `${mvp}-${sProp}` as const : mvp;

		const aVar = pseudo ? `${mvp}-opacity-${pseudo}` as const : `${mvp}-opacity` as const;

		const vVal = this.vars.variant(pseudo ? `${vp}-${pseudo}` : vp);
		// Outside the `universal` scope the default variant's opacity is the fallback, which `withFallback` fills in
		const one = this.scope === 'universal' ? '1' : undefined;
		const vAlpha = this.vars.variant(aVar, pseudo ? this.vars.variant(`${mvp}-opacity`, one) : one);

		switch (mProp) {
			case 'bg': this.theme.applyBackgroundColor(vVal, target, vAlpha); break;
			case 'border': this.theme.applyBorderColor(vVal, target, vAlpha); break;
			case 'text': this.theme.applyTextColor(vVal, target, vAlpha); break;
		}

		if (alpha) {
			target[this.vars.v(aVar)] = `${alpha} !important`;

			// The element need not have a `v-*` class, so the reset of the `element` scope would not reach its children.
			if (this.scope === 'element') {
				(target as Record<string, unknown>)[':where(&) > *'] = { [this.vars.v(aVar)]: 'initial' };
			}
		}

		return target;
	}
}
