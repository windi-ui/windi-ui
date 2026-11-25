import { definePreset } from '../preset';

/** The variants of Nuxt UI that WindiUI lacks: `soft`, `subtle`, `ghost` and `link`. `solid` and `outline` exist. */
export const nuxtUi = definePreset('nuxt-ui', b => b
	.setVariant('soft', ({ vars: { color: c } }) => ({
		bg: c('100'), border: c('100'), 'border-opacity': '0', fg: c('800'),
		pseudos: { ':hover': { bg: c('200') } },
		dark: { bg: c('900'), 'bg-opacity': '0.5', fg: c('300'), pseudos: { ':hover': { bg: c('800') } } },
	}))
	.setVariant('subtle', ({ vars: { color: c } }) => ({
		bg: c('50'), border: c('200'), fg: c('800'),
		pseudos: { ':hover': { bg: c('100') } },
		dark: { bg: c('950'), 'bg-opacity': '0.5', border: c('800'), fg: c('300'), pseudos: { ':hover': { bg: c('900') } } },
	}))
	.setVariant('ghost', ({ vars: { color: c } }) => ({
		bg: c('50'), 'bg-opacity': '0', border: c('50'), 'border-opacity': '0', fg: c('700'),
		pseudos: { ':hover': { 'bg-opacity': '1' } },
		dark: { bg: c('900'), fg: c('400'), pseudos: { ':hover': { 'bg-opacity': '0.5' } } },
	}))
	.setVariant('link', ({ vars: { color: c } }) => ({
		bg: c('50'), 'bg-opacity': '0', border: c('50'), 'border-opacity': '0', fg: c('700'),
		pseudos: { ':hover': { fg: c('800') } },
		dark: { fg: c('400'), pseudos: { ':hover': { fg: c('300') } } },
	})));
