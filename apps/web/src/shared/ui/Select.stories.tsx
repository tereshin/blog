import preview from '#.storybook/preview'
import { Select } from './Select.tsx'
const meta = preview.meta({
  title: 'shared/Select',
  component: Select,
  args: {
    options: [
      { value: 'one', label: 'Первый вариант' },
      { value: 'two', label: 'Второй вариант' },
    ],
    defaultValue: 'one',
    'aria-label': 'Выбор',
  },
  decorators: [
    (Story) => (
      <div className="p-6">
        <Story />
      </div>
    ),
  ],
})
export const LightBasePrimary = meta.story({
  args: { size: 'base', variant: 'primary' },
  decorators: [
    (Story) => (
      <div data-theme="light" className="bg-background p-6">
        <Story />
      </div>
    ),
  ],
})
export const LightBaseSecondary = meta.story({
  args: { size: 'base', variant: 'secondary' },
  decorators: [
    (Story) => (
      <div data-theme="light" className="bg-background p-6">
        <Story />
      </div>
    ),
  ],
})
export const LightLgPrimary = meta.story({
  args: { size: 'lg', variant: 'primary' },
  decorators: [
    (Story) => (
      <div data-theme="light" className="bg-background p-6">
        <Story />
      </div>
    ),
  ],
})
export const LightLgSecondary = meta.story({
  args: { size: 'lg', variant: 'secondary' },
  decorators: [
    (Story) => (
      <div data-theme="light" className="bg-background p-6">
        <Story />
      </div>
    ),
  ],
})
export const DarkBasePrimary = meta.story({
  args: { size: 'base', variant: 'primary' },
  decorators: [
    (Story) => (
      <div data-theme="dark" className="bg-background p-6">
        <Story />
      </div>
    ),
  ],
})
export const DarkBaseSecondary = meta.story({
  args: { size: 'base', variant: 'secondary' },
  decorators: [
    (Story) => (
      <div data-theme="dark" className="bg-background p-6">
        <Story />
      </div>
    ),
  ],
})
export const DarkLgPrimary = meta.story({
  args: { size: 'lg', variant: 'primary' },
  decorators: [
    (Story) => (
      <div data-theme="dark" className="bg-background p-6">
        <Story />
      </div>
    ),
  ],
})
export const DarkLgSecondary = meta.story({
  args: { size: 'lg', variant: 'secondary' },
  decorators: [
    (Story) => (
      <div data-theme="dark" className="bg-background p-6">
        <Story />
      </div>
    ),
  ],
})
export const Disabled = meta.story({ args: { isDisabled: true } })
export const Invalid = meta.story({ args: { isInvalid: true } })
