import { defineConfig, type UserConfig } from 'tsdown';

export default (entry: Record<string, string> = { index: './src/index.ts' }): UserConfig => defineConfig({
	entry,
	format: ['esm', 'cjs'],
	dts: { sourcemap: false },
	exports: true,
	publint: true,
	attw: { profile: 'node16', level: 'error' }
});
