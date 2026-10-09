import type { Decorator, Preview } from '@storybook/react-vite'
import type { RequestHandler } from 'msw'
import { setupWorker } from 'msw/browser'
import addonMsw from 'msw-storybook-addon'
import { handlers } from '../src/shared/api/mocks/handlers/index.ts'
import '../src/app/styles/globals.css'

const msw = addonMsw(async () => {
  const worker = setupWorker()
  await worker.start({ onUnhandledRequest: 'bypass', quiet: true })
  return worker
})

function listedHandlers(value: unknown): RequestHandler[] {
  if (!value || typeof value !== 'object' || !('handlers' in value)) return []
  const list = value.handlers
  return Array.isArray(list) ? list.filter((item): item is RequestHandler => typeof item === 'function' || (typeof item === 'object' && item !== null)) : []
}

const with_theme: Decorator = (Story, context) => {
  const theme = context.globals['theme'] === 'light' ? 'light' : 'dark'
  document.documentElement.classList.remove('light', 'dark')
  document.documentElement.classList.add(theme)
  document.documentElement.setAttribute('data-theme', theme)
  return <Story />
}

const preview: Preview = {
  decorators: [with_theme],
  async beforeEach(context) {
    const cleanup = await msw.beforeEach?.(context)
    const worker = (context as { msw?: { use: (...next: RequestHandler[]) => void } }).msw
    const story = listedHandlers(context.parameters['msw'])
    worker?.use(...story, ...handlers)
    return cleanup
  },
  globalTypes: {
    theme: {
      description: 'Вид оформления',
      toolbar: {
        title: 'Вид',
        icon: 'mirror',
        items: [
          { value: 'dark', title: 'Тёмный' },
          { value: 'light', title: 'Светлый' },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: { theme: 'dark' },
  parameters: { layout: 'fullscreen' },
}

export default preview
