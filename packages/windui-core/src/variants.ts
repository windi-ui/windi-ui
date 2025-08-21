import { type VarsProvider, type CSSVarName, type CSSVarValue, type CSSValues, cssVars } from "./vars";
import type { CSS, ThemeProvider } from "./types";

export type VariantVars = Record<CSSVarName<'v'>, string>;
export type VariantPropValue = CSSVarValue<'c'> | CSSVarValue<'v'>;

export interface VariantProps {
	'bg': VariantPropValue;
	'bg-soft'?: VariantPropValue;
	'bg-muted'?: VariantPropValue;
	'bg-accent'?: VariantPropValue;
	'bg-opacity'?: string;

	'border': VariantPropValue;
	'border-soft'?: VariantPropValue;
	'border-muted'?: VariantPropValue;
	'border-accent'?: VariantPropValue;
	'border-opacity'?: string;

	'fg': VariantPropValue;
	'fg-soft'?: VariantPropValue;
	'fg-muted'?: VariantPropValue;
	'fg-accent'?: VariantPropValue;
	'fg-opacity'?: string;
}

export interface Variant extends VariantProps {
	pseudos?: Partial<Record<CSS.SimplePseudos, Partial<VariantProps>>>;
	//dark?: Omit<Variant, 'dark'>;
}

export type ApplyVariantMainProp = 'bg' | 'border' | 'text';
export type ApplyVariantSubProp = 'soft' | 'muted' | 'accent'| 'default';
export type ApplyVariantProp = ApplyVariantMainProp | `${ApplyVariantMainProp}-${Exclude<ApplyVariantSubProp, 'default'>}`;

export type ApplyVariant = boolean | ApplyVariantProp[];
export type ApplyVariantPseudos = Partial<Record<CSS.SimplePseudos, ApplyVariant>> | CSS.SimplePseudos[] | false;

export interface VariantContext {
	apply(
		v?: ApplyVariant,
		pseudos?: ApplyVariantPseudos,
		target?: CSS.Properties
	): CSS.Properties;
}

export interface VariantProvider extends VariantContext {
	names(): string[];
	cssVars(name: string): Record<string, string>;
	rootVars(): Record<string, string>;
}

export function defaultVariant(vars: VarsProvider): Variant {
	return {
		'bg': vars.color('50'),
		'bg-soft': vars.color('100'),
		'bg-muted': vars.color('300'),
		'bg-accent': vars.color.accent('100'),
		'bg-opacity': '1',

		'border': vars.color('400'),
		'border-soft': vars.color('300'),
		'border-muted': vars.color('200'),
		'border-accent': vars.color.accent('400'),
		'border-opacity': '1',

		'fg': vars.color('800'),
		'fg-soft': vars.color('700'),
		'fg-muted': vars.color('600'),
		'fg-accent': vars.color.accent('500'),
		'fg-opacity': '1',

		pseudos: {
			':hover': {
				'bg': vars.color('100'),
				'bg-soft': vars.color('200'),
				'bg-muted': vars.color('400'),
				'bg-accent': vars.color.accent('200'),

				'border': vars.color('500'),
				'border-soft': vars.color('400'),
				'border-muted': vars.color('300'),
				'border-accent': vars.color.accent('500'),
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
			'border-opacity': '1',

			'fg': vars.color('white'),
			'fg-soft': vars.color('50'),
			'fg-muted': vars.color('100'),
			'fg-accent': vars.color.accent('50'),
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
					'bg-opacity': '1',
				}
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
			'border-opacity': '1',

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
			}
		}
	};
}

export function variantsProvider(vars: VarsProvider, theme: ThemeProvider): VariantProvider {
	const variants = new Map<string, Variant>([
		['default', defaultVariant(vars)],
		...Object.entries(mainVariants(vars))
	]);

	function vCssVars(name: string) {
		const variant = variants.get(name);
		if (!variant) {
			console.error(`Variant "${name}" not found.`);
			return {};
		}

		const { pseudos: vPseudos, ...vProps } = variant;
		const cssObj = vProps as CSSValues;

		if (vPseudos) {
			const propKeys = new Set(Object.keys(vProps) as (keyof VariantProps)[]);
			for (const vpk in vPseudos) {
				const vp = vPseudos[vpk as CSS.SimplePseudos];
				if (vp) {
					const vpPropKeys = (new Set(Object.keys(vp) as (keyof VariantProps)[])).union(propKeys);
					for (const vppk of vpPropKeys) {
						cssObj[`${vppk}-${vpk}`] = (vppk in vp) ? vp[vppk]! : vProps[vppk]!;
					}
				}
			}
		}

		return cssVars(cssObj, n => vars.v(n));
	}

	return {
		names() {
			return [...variants.keys()];
		},
		cssVars(name) {
			// TODO: handle accent color conditionally
			return vCssVars(name);
		},
		rootVars() {
			return vCssVars('default');
		},
		apply(v = true, pseudos?, target = {}) {
			function appl(pV: ApplyVariant, pTarget: CSS.Properties, pseudo?: CSS.SimplePseudos) {
				if (pV === false)
					return pTarget;
				if (pV === true)
					pV = ['bg', 'border', 'text'];

				const aV = pV;

				function applProp(mProp: ApplyVariantMainProp, func: (value: string, target: CSS.Properties, alpha?: string) => void) {
					const sP = aV.find(p => p.startsWith(mProp));
					if (!sP) return;

					const mvp = mProp === 'text' ? 'fg' : mProp;
					const vp = (mProp === 'text' ? sP.replace(/^text/, 'fg') : sP) as keyof VariantProps;

					func(
						vars.variant(pseudo ? `${vp}-${pseudo}` : vp), pTarget,
						vars.variant(pseudo ? `${mvp}-opacity-${pseudo}` : `${mvp}-opacity`,
							pseudo ? vars.variant(`${mvp}-opacity`, '1') : '1'));
				}

				applProp('bg', theme.applyBackgroundColor.bind(theme));
				applProp('border', theme.applyBorderColor.bind(theme));
				applProp('text', theme.applyTextColor.bind(theme));

				return pTarget;
			}

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
	};
}
