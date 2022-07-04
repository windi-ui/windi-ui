import { defineBuildConfig } from 'unbuild';
import { fileURLToPath, URL } from 'url';

export default defineBuildConfig({
	entries: [
		{
			name: 'types',
			input: './src/types/index'
		},
		{
			name: 'index',
			input: './src/index'
		}
	],
	declaration: true,
	clean: true,
	rollup: {
		emitCJS: true,
	},
	alias: {
		'@': fileURLToPath(new URL('./src', import.meta.url))
	}
});
