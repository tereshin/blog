import { setupWorker } from 'msw/browser'
import { installFakeEventSource } from './fake-event-source.ts'
import { handlers } from './handlers/index.ts'

export const worker = setupWorker(...handlers)

/** Запускает фикстурный gateway. Вызывается из `main.tsx` только при `VITE_API_MOCK=1`. */
export async function startMockApi(): Promise<void> {
  installFakeEventSource()
  await worker.start({ onUnhandledRequest: 'bypass', quiet: true })
}
