import { cpSync } from 'node:fs'
import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/main.ts', 'src/migrate.ts'],
  format: ['esm'],
  platform: 'node',
  target: 'node22',
  clean: true,
  sourcemap: false,
  noExternal: [/^@blog\//],
  external: [/^(?!@blog\/)[^./].*/],
  onSuccess: async () => {
    cpSync('src/infra/db/migrations', 'dist/migrations', { recursive: true })
  },
})
