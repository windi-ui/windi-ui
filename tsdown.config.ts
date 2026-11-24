import { defineConfig, type UserConfig } from 'tsdown';

export default (entry: Record<string, string> = { index: './src/index.ts' }): UserConfig => defineConfig({
	entry,
	format: ['esm', 'cjs'],
	dts: { sourcemap: false },
	// No `devExports`: Tailwind v3 loads its config with jiti 1, which cannot parse
	// the `import.meta.resolve` in windui-tailwind/src/theme.ts, so consumers read dist.
	exports: true,
	publint: true,
	attw: { profile: 'node16', level: 'error' }
});
