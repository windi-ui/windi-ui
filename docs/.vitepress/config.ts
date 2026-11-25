import { defineConfig } from 'vitepress';
import tailwindcss from '@tailwindcss/postcss';

// GitHub Pages serves a project site under `/<repo>/`; the deploy workflow passes that path in.
const base = process.env.DOCS_BASE ?? '/';
const repo = 'https://github.com/windi-ui/windi-ui';

export default defineConfig({
	base,
	lang: 'en-US',
	title: 'WindiUI',
	description: 'Colour, variant and size utilities and components for Tailwind CSS v3 and v4.',
	cleanUrls: true,
	lastUpdated: true,

	head: [
		['link', { rel: 'icon', type: 'image/svg+xml', href: `${base}favicon.svg` }],
		['link', { rel: 'apple-touch-icon', href: `${base}logo.svg` }],
		['meta', { name: 'theme-color', content: '#6366f1' }],
	],

	vite: {
		css: {
			postcss: { plugins: [tailwindcss()] },
		},
	},

	themeConfig: {
		logo: '/logo.svg',

		nav: [
			{ text: 'Guide', link: '/guide/introduction', activeMatch: '^/guide/' },
			{ text: 'Reference', link: '/reference/options', activeMatch: '^/reference/' },
			{ text: 'Roadmap', link: '/roadmap' },
		],

		sidebar: [
			{
				text: 'Guide',
				items: [
					{ text: 'Introduction', link: '/guide/introduction' },
					{ text: 'Installation', link: '/guide/installation' },
					{ text: 'Colors', link: '/guide/colors' },
					{ text: 'Variants', link: '/guide/variants' },
					{ text: 'Sizes', link: '/guide/sizes' },
					{ text: 'Dark mode', link: '/guide/dark-mode' },
					{ text: 'Components', link: '/guide/components' },
					{ text: 'Utilities', link: '/guide/utilities' },
					{ text: 'Customizing', link: '/guide/customizing' },
				],
			},
			{
				text: 'Reference',
				items: [
					{ text: 'Options', link: '/reference/options' },
					{ text: 'Config files', link: '/reference/config-file' },
					{ text: 'Builder API', link: '/reference/builder' },
					{ text: 'CSS variables', link: '/reference/css-variables' },
				],
			},
			{ text: 'Changes in 0.8', link: '/changes-0.8' },
			{ text: 'Roadmap', link: '/roadmap' },
		],

		socialLinks: [
			{ icon: 'github', link: repo },
			{ icon: 'npm', link: 'https://www.npmjs.com/package/@windi-ui/tailwind' },
		],

		editLink: {
			pattern: `${repo}/edit/main/docs/:path`,
		},

		search: { provider: 'local' },

		footer: {
			message: 'Released under the MIT License.',
			copyright: 'Copyright © Waleed Khaled',
		},
	},
});
