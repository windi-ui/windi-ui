import type { Config } from 'tailwindcss';
import windui from 'windui-tailwind'

const config: Config = {
	content: [
		"./index.html",
		"./src/**/*.{vue,js,ts,jsx,tsx}",
	],
	theme: {
		extend: {
			colors: {
				hsx: {
					50: 'hsl(260, 91%, 95%)',
					100: 'hsl(259, 88%, 86%)',
					200: 'hsl(259, 88%, 77%)',
					300: 'hsl(259, 88%, 68%)',
					400: 'hsl(259, 88%, 59%)',
					500: 'hsl(259, 87%, 50%)',
					600: 'hsl(259, 88%, 41%)',
					700: 'hsl(259, 88%, 32%)',
					800: 'hsl(259, 88%, 23%)',
					900: 'hsl(260, 88%, 14%)',
					950: 'hsl(260, 91%, 5%)',
				}
			}
		},
	},
	plugins: [
		windui()
	],
}

export default config;
