import { defineConfig } from '@sc-voice/vitest/config.mjs';

export default defineConfig({
  test: {
    include: ['test/**/*.mjs'],
    exclude: ['test/vitest.config.mjs', 'test/data/**'],
    testTimeout: 15000,
    fileParallelism: false,
  },
});
