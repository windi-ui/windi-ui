import { defineBuildConfig, BuildConfig } from 'unbuild';
import { fileURLToPath, URL } from 'url';

export default (root: string, entries: BuildConfig['entries'] = ['./src/index']) => defineBuildConfig({
	entries,
	declaration: true,
	clean: true,
	rollup: {
		inlineDependencies: true,
		emitCJS: true,
		dts: {
			compilerOptions: {
				composite: false
			}
		}
	},
	alias: {
		'@': fileURLToPath(new URL('./src', root))
	}
});
