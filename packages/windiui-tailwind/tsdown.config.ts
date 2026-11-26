import defineBuildConfig from '../../tsdown.config.ts';

export default defineBuildConfig({
	index: './src/index.ts',
	v3: './src/v3.ts',
	v4: './src/v4.ts',
	config: './src/config.ts',
	safelist: './src/safelist.ts',
	presets: './src/presets.ts',
	palettes: './src/palettes.ts'
}, {
	// With named exports beside the default, `cjsDefault` no longer makes the plugin `module.exports`. A Tailwind 3
	// config calls `require('@windi-ui/tailwind')()`, so the plugin becomes the module and carries the named exports.
	footer: ({ format, fileName }) => format === 'cjs' && fileName === 'index.cjs'
		? { js: 'module.exports = Object.assign(exports.default, exports);' }
		: undefined,
	// The footer settles the mixed default and named exports that rolldown warns about.
	suppressWarnings: ['[MIXED_EXPORTS]'],
	// The types of that shape: `export =` a function, so `require(...)()` type-checks, merged with a namespace that
	// holds the named exports (a const cannot merge with one that holds values). tsdown leaves `plugins` out of the
	// build of the `.d.cts` files, so the plugin is added here.
	inputOptions: (options, _, { cjsDts }) => cjsDts ? {
		...options,
		plugins: [options.plugins, {
			name: 'cjs-index-types',
			generateBundle(_, bundle) {
				const chunk = bundle['index.d.cts'];
				if (chunk?.type !== 'chunk') return;
				const code = chunk.code.replace(/^export \{ (.*\b_default as default\b.*) \};$/m, (_, names: string) => [
					'declare function _cjs(...args: Parameters<typeof _default>): ReturnType<typeof _default>;',
					`declare namespace _cjs {\n  export { ${names} };\n  export const __isOptionsFunction: true;\n}`,
					'export = _cjs;'
				].join('\n'));
				if (code === chunk.code) this.error('index.d.cts: the export list to rewrite was not found');
				chunk.code = code;
			}
		}]
	} : options
});
