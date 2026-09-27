import { defineConfig } from 'vitest/config';

// Vitest 5 configures projects here. The vitest.workspace.ts file was removed in Vitest 4.
export default defineConfig({
  test: {
    projects: ['apps/api-gateway/vitest.config.mts'],
  },
});
