import defineBuildConfig from '../../tsdown.config.ts';

export default defineBuildConfig({
	index: './src/index.ts',
	components: './src/components/index.ts',
	presets: './src/presets/index.ts',
	theme: './src/theme/index.ts'
});
