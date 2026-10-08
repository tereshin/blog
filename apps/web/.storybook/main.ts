import type { StorybookConfig } from '@storybook/react-vite'

// vite.config.ts подхватывается автоматически: alias `@/` и Tailwind уже подключены.
const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(ts|tsx)'],
  framework: '@storybook/react-vite',
  staticDirs: ['../public'],
}

export default config
