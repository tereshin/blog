import type { Meta, StoryObj } from '@storybook/react-vite'
import { Textarea } from './Textarea.tsx'
const meta = {
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
} satisfies Meta<typeof Textarea>
export default meta
type Story = StoryObj<typeof meta>
export const LightBasePrimary: Story = {
  args: { size: 'base', variant: 'primary' },
  decorators: [
    (Story) => (
      <div data-theme="light" className="bg-background p-6">
        <Story />
      </div>
    ),
  ],
}
export const LightBaseSecondary: Story = {
  args: { size: 'base', variant: 'secondary' },
  decorators: [
    (Story) => (
      <div data-theme="light" className="bg-background p-6">
        <Story />
      </div>
    ),
  ],
}
export const LightLgPrimary: Story = {
  args: { size: 'lg', variant: 'primary' },
  decorators: [
    (Story) => (
      <div data-theme="light" className="bg-background p-6">
        <Story />
      </div>
    ),
  ],
}
export const LightLgSecondary: Story = {
  args: { size: 'lg', variant: 'secondary' },
  decorators: [
    (Story) => (
      <div data-theme="light" className="bg-background p-6">
        <Story />
      </div>
    ),
  ],
}
export const DarkBasePrimary: Story = {
  args: { size: 'base', variant: 'primary' },
  decorators: [
    (Story) => (
      <div data-theme="dark" className="bg-background p-6">
        <Story />
      </div>
    ),
  ],
}
export const DarkBaseSecondary: Story = {
  args: { size: 'base', variant: 'secondary' },
  decorators: [
    (Story) => (
      <div data-theme="dark" className="bg-background p-6">
        <Story />
      </div>
    ),
  ],
}
export const DarkLgPrimary: Story = {
  args: { size: 'lg', variant: 'primary' },
  decorators: [
    (Story) => (
      <div data-theme="dark" className="bg-background p-6">
        <Story />
      </div>
    ),
  ],
}
export const DarkLgSecondary: Story = {
  args: { size: 'lg', variant: 'secondary' },
  decorators: [
    (Story) => (
      <div data-theme="dark" className="bg-background p-6">
        <Story />
      </div>
    ),
  ],
}
export const Disabled: Story = { args: { disabled: true } }
export const Invalid: Story = { args: { 'aria-invalid': true } }
export const Readonly: Story = { args: { readOnly: true, value: 'Значение только для чтения' } }
export const Hover: Story = { render: (args) => <Textarea {...args} data-hovered="true" /> }
export const Focus: Story = { render: (args) => <Textarea {...args} data-focus-visible="true" /> }
