import windui from '@windi-ui/tailwind';

export default windui({
	build(builder) {
		builder
			.updateVariant('light', (variant) => {
				variant['bg-opacity'] = '0.30';
			});
	}
});
