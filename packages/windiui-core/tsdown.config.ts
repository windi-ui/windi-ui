import defineBuildConfig from '../../tsdown.config.ts';

// One object for both builds, so that tsdown writes one export map. The CLI is the `windiui` command, not an entry to import.
const exports = { exclude: ['cli'], bin: { windiui: './src/cli.ts' } };

export default [
	defineBuildConfig({
		index: './src/index.ts',
		components: './src/components/index.ts',
		presets: './src/presets/index.ts',
		theme: './src/theme/index.ts'
	}, { exports }),
	// Node only, and only run: ES module, no types
	defineBuildConfig({ cli: './src/cli.ts' }, { format: 'esm', dts: false, exports, publint: false, attw: false })
];
