import { defineConfig } from 'tsup'

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
