import defineBuildConfig from '../../build.config';

export default defineBuildConfig(import.meta.url, [
	{
		name: 'types',
		input: './src/types/index'
	},
	{
		name: 'index',
		input: './src/index'
	}
]);
