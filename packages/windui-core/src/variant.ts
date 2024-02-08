import { type VarsProvider } from "./varsProvider";

export type Variant = {
	text: string;
	background: string;
	border: string;
	'text-hover': string;
	'background-hover': string;
	'border-hover': string;
};

export function variants(vars: VarsProvider) {
	return {
		default: {
			background: vars.color('50'),
			border: vars.color('400'),
			text: vars.color('700'),
			'background-hover': vars.color('100'),
			'border-hover': vars.color('500'),
			'text-hover': vars.color('700'),
		},
		solid: {
			background: vars.color('600'),
			border: vars.color('600'),
			text: vars.color('50'),
			'background-hover': vars.color('700'),
			'border-hover': vars.color('700'),
			'text-hover': vars.color('50'),
		},
		outline: {
			background: vars.color('transparent'),
			border: vars.color('600'),
			text: vars.color('600'),
			'background-hover': vars.color('600'),
			'border-hover': vars.color('600'),
			'text-hover': vars.color('50'),
		},
		light: {
			background: vars.color('100'),
			border: vars.color('100'),
			text: vars.color('600'),
			'background-hover': vars.color('600'),
			'border-hover': vars.color('600'),
			'text-hover': vars.color('50'),
		}
	};
}
