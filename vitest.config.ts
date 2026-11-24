import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		include: ['test/**/*.test.ts'],
		// The helpers call `process.chdir()`, which worker threads do not have.
		pool: 'forks',
	},
});
