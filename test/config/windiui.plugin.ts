import windiui from '@windi-ui/tailwind';

// A plugin module: what `@plugin "./windiui.plugin.ts"` loads. The config loader unwraps it too, when it is named as a config file.
// Typed, because this project emits declarations and cannot name the plugin's Tailwind 3 types.
const plugin: unknown = windiui({
	prefix: 'mod',
	build: builder => builder.removeComponent('badge'),
});

export default plugin;
