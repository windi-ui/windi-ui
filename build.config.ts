import { defineBuildConfig, BuildConfig } from 'unbuild';
import { fileURLToPath, URL } from 'url';

export default (root: string, entries: BuildConfig['entries'] = ['./src/index']) => defineBuildConfig({
	entries,
	declaration: true,
	clean: true,
	rollup: {
		emitCJS: true,
	},
	alias: {
		'@': fileURLToPath(new URL('./src', root))
	}
});
