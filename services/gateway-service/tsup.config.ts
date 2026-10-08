import { defineConfig } from 'tsup'

// Бандлятся только рабочие пакеты @blog/* (у них TS-исходники). Всё остальное — внешнее:
// зависимости ставит `pnpm deploy --prod` в образ, включая зависимости @blog/*.
export default defineConfig({
  entry: ['src/main.ts'],
  format: ['esm'],
  platform: 'node',
  target: 'node22',
  clean: true,
  sourcemap: false,
  noExternal: [/^@blog\//],
  external: [/^(?!@blog\/)[^./].*/],
})
