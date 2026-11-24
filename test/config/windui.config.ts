import windui from '@windi-ui/tailwind';

// A config module: what `@plugin "./windui.config.ts"` loads, and what the config loader has to unwrap.
// Typed, because this project emits declarations and cannot name the plugin's Tailwind 3 types.
const plugin: unknown = windui({
	prefix: 'mod',
	build: builder => builder.removeComponent('badge'),
});

export default plugin;
