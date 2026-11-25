import windiui from '@windi-ui/tailwind';

export default windiui({
	presets: ['nuxt-ui'],
	build(builder) {
		builder
			.updateVariant('light', (variant) => {
				variant['bg-opacity'] = '0.30';
			})
			.overrideVariant('solid', 'yellow', { bg: '700', pseudos: { ':hover': { bg: '800' } } });
	}
});
