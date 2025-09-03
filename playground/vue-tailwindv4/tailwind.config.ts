import type { Config } from 'tailwindcss';
import windui from 'windui-tailwind'

const config: Config = {
	content: [
		"./index.html",
		"./src/**/*.{vue,js,ts,jsx,tsx}",
	],
	theme: {
		extend: {},
	},
	plugins: [
		// @ts-ignore
		windui({
			build(builder) {
				builder
					.updateVariant('light', (variant) => {
						variant['bg-opacity'] = '0.30';
					});
			}
		})
	],
}

export default config;
