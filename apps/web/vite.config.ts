import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { visualizer } from 'rollup-plugin-visualizer'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // Отчёт о составе бандла: `ANALYZE=1 pnpm --filter web build` -> dist/stats.html
    ...(process.env['ANALYZE'] ? [visualizer({ filename: 'dist/stats.html', gzipSize: true })] : []),
  ],
  resolve: {
    alias: { '@': path.resolve(import.meta.dirname, 'src') },
  },
  server: {
    port: 5173,
    // Один origin в разработке: cookie сессии и CSRF работают так же, как в prod.
    proxy: { '/v1': { target: 'http://localhost:3000', changeOrigin: false } },
  },
  build: {
    // Sourcemaps в бандл не попадают (session-security.mdc).
    sourcemap: false,
  },
})
