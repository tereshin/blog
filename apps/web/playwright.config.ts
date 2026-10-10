import { defineConfig } from '@playwright/test'

// E2E_TARGET=local — окружение Compose (малый seed, вход через эмулятор Firebase Auth).
// База: E2E_BASE_URL, иначе PUBLIC_ORIGIN, иначе http://localhost:8080.
// WEB_ORIGIN gateway должен совпадать с этим origin (иначе CORS режет /v1).
// По умолчанию — Vite dev-сервер с фикстурным gateway (VITE_API_MOCK=1) на :5173.
const is_local_target = process.env['E2E_TARGET'] === 'local'
const base_url = is_local_target
  ? (process.env['E2E_BASE_URL'] ?? process.env['PUBLIC_ORIGIN'] ?? 'http://localhost:8080')
  : (process.env['E2E_BASE_URL'] ?? 'http://localhost:5173')

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  // Пять воркеров на этом хосте роняют Vite mid-suite (ERR_CONNECTION_REFUSED).
  workers: process.env['CI'] ? undefined : 3,
  retries: process.env['CI'] ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: base_url,
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'wide-dark', use: { viewport: { width: 1280, height: 800 }, colorScheme: 'dark' } },
    { name: 'wide-light', use: { viewport: { width: 1280, height: 800 }, colorScheme: 'light' } },
    { name: 'narrow-dark', use: { viewport: { width: 390, height: 844 }, colorScheme: 'dark' } },
  ],
  webServer: is_local_target
    ? undefined
    : {
        command: `pnpm dev --port ${new URL(base_url).port || '5173'} --strictPort`,
        env: { VITE_API_MOCK: '1' },
        url: base_url,
        reuseExistingServer: !process.env['CI'],
      },
})
