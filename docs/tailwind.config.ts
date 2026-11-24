import type { Config } from 'tailwindcss';
import windui from '@windi-ui/tailwind';

const config: Config = {
	// VitePress toggles a `.dark` class on <html>
	darkMode: ['selector', '.dark'],
	plugins: [
		// @ts-expect-error the plugin is typed against Tailwind v3
		windui({
			// The examples of guide/customizing.md, live. Keep the two in sync.
			build(builder) {
				builder
					.addVariant('ghost', ({ vars }) => ({
						'bg': vars.color('100'),
						'bg-opacity': '0',
						'border': vars.color('600'),
						'border-opacity': '0',
						'fg': vars.color('700'),

						pseudos: {
							':hover': { 'bg-opacity': '1' }
						},

						dark: {
							'bg': vars.color('800'),
							'fg': vars.color('300'),

							pseudos: {
								':hover': { 'bg-opacity': '1' }
							}
						}
					}))
					.addSize('2xl', ({ theme }) => ({
						spacing: {
							'1': theme.spacing('3'),
							'1.5': theme.spacing('4'),
							'2': theme.spacing('5'),
							'3': theme.spacing('6'),
							'4': theme.spacing('8'),
						},
						text: theme.fontSize('2xl')
					}))
					.addComponent('chip', ({ vars }) => ({
						name: 'chip',
						applyVariant: ['bg-soft', 'text', 'border-muted'],
						style: {
							display: 'inline-flex',
							alignItems: 'center',
							padding: `${vars.size('spacing-1')} ${vars.size('spacing-3')}`,
							borderWidth: '1px',
							borderRadius: '9999px',
							fontSize: vars.size('text'),
							lineHeight: vars.size('line-height'),
						}
					}));
			}
		})
	],
};

export default config;
