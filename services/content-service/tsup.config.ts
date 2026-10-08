import { cpSync } from 'node:fs'
import { defineConfig } from 'tsup'

// Бандлятся только рабочие пакеты @blog/* (у них TS-исходники). Всё остальное — внешнее:
// зависимости ставит `pnpm deploy --prod` в образ. Одноразовые задачи — отдельные точки входа.
export default defineConfig({
  entry: ['src/main.ts', 'src/migrate.ts', 'src/seed.ts'],
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
