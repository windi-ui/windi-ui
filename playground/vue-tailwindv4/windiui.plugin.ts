import windiui from '@windi-ui/tailwind';

export default windiui({
	presets: ['nuxt-ui'],
	states: { open: '[data-state=open]', invalid: '[aria-invalid=true]' },
	build(builder) {
		builder
			.updateVariant('light', (variant) => {
				variant['bg-opacity'] = '0.30';
			})
			// The states of a headless select trigger
			.updateVariant('outline', (variant, { vars }) => ({
				...variant,
				pseudos: {
					...variant.pseudos,
					':focus-visible': { border: vars.color('500') },
					'[data-state=open]': { bg: vars.color('100'), 'bg-opacity': '1' },
					'[aria-invalid=true]': { border: vars.color.accent('600') },
				},
			}))
			.overrideVariant('solid', 'yellow', { bg: '700', pseudos: { ':hover': { bg: '800' } } });
	}
});
