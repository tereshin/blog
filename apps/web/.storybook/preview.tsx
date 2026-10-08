import type { Decorator, Preview } from '@storybook/react-vite'
import { initialize, mswLoader } from 'msw-storybook-addon'
import { handlers } from '../src/shared/api/mocks/handlers/index.ts'
import '../src/app/styles/globals.css'

// HeroUI v3 не требует провайдера: вид задаётся классом и атрибутом на <html>.
initialize({ onUnhandledRequest: 'bypass' })

const with_theme: Decorator = (Story, context) => {
  const theme = context.globals['theme'] === 'light' ? 'light' : 'dark'
  document.documentElement.classList.remove('light', 'dark')
  document.documentElement.classList.add(theme)
  document.documentElement.setAttribute('data-theme', theme)
  return <Story />
}

const preview: Preview = {
  decorators: [with_theme],
  loaders: [mswLoader],
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
  // Те же обработчики, что у фикстурного gateway в приложении и Playwright.
  parameters: { layout: 'fullscreen', msw: { handlers } },
}

export default preview
