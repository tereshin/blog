import { cpSync } from 'node:fs'
import { defineConfig } from 'tsup'

export default defineConfig({
  entry: { main: 'src/main.ts', migrate: 'src/migrate.ts', seed: 'src/seed.ts', 'renderer.worker': 'src/modules/social-cover/renderer.worker.ts' },
  format: ['esm'],
  platform: 'node',
  target: 'node22',
  clean: true,
  sourcemap: false,
  noExternal: [/^@blog\//],
  external: [/^(?!@blog\/)[^./].*/],
  onSuccess: async () => {
    cpSync('src/infra/db/migrations', 'dist/migrations', { recursive: true })
    cpSync('assets/fonts', 'dist/fonts', { recursive: true })
  },
})
