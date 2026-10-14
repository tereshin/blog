import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from '@/app/App'

const root_element = document.getElementById('root')
if (!root_element) throw new Error('Не найден контейнер #root')

createRoot(root_element).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
