import preview from '#.storybook/preview'
import { Textarea } from './Textarea.tsx'
const meta = preview.meta({
  title: 'shared/Textarea',
  component: Textarea,
  args: { placeholder: 'Введите текст', 'aria-label': 'Поле' },
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
export const Disabled = meta.story({ args: { disabled: true } })
export const Invalid = meta.story({ args: { 'aria-invalid': true } })
export const Readonly = meta.story({ args: { readOnly: true, value: 'Значение только для чтения' } })
export const Hover = meta.story({ render: (args) => <Textarea {...args} data-hovered="true" /> })
export const Focus = meta.story({ render: (args) => <Textarea {...args} data-focus-visible="true" /> })
