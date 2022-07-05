import defineBuildConfig from '../../build.config';

export default defineBuildConfig(import.meta.url, [
	{
		name: 'index',
		input: './src/index'
	},
	{
		name: 'components',
		input: './src/components/index'
	},
	{
		name: 'types',
		input: './src/types/index'
	},
]);
