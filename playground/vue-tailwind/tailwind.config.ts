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
		windui()
	],
}

export default config;
