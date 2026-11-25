import windiui from '@windi-ui/tailwind';

export default windiui({
	build(builder) {
		builder
			.updateVariant('light', (variant) => {
				variant['bg-opacity'] = '0.30';
			});
	}
});
