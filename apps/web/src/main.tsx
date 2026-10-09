import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from '@/app/App'
import { env } from '@/shared/config'
import { reportWebVitals } from '@/shared/lib'
import '@/app/styles/globals.css'

const root_element = document.getElementById('root')
if (!root_element) throw new Error('Не найден контейнер #root')

async function bootstrap(container: HTMLElement) {
  // Фикстурный gateway поднимается только по явному флагу.
  if (env.is_api_mock) {
    const { startMockApi } = await import('@/shared/api/mocks')
    await startMockApi()
  }
  createRoot(container).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

reportWebVitals()
void bootstrap(root_element)
