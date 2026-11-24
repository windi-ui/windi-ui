import { h } from 'vue';
import type { Theme } from 'vitepress';
import DefaultTheme from 'vitepress/theme';
import './style.css';

export default {
	extends: DefaultTheme,
	enhanceApp({ app }) {
		// <Demo> wraps a live example in markdown; `class` falls through to the box
		app.component('Demo', (_, { slots }) => h('div', { class: 'wui-demo' }, slots.default?.()));
	},
} satisfies Theme;
