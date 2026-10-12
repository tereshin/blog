import type { Meta, StoryObj } from '@storybook/react-vite'
import { Select } from './Select.tsx'
const meta = {
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
} satisfies Meta<typeof Select>
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
export const Disabled: Story = { args: { isDisabled: true } }
export const Invalid: Story = { args: { isInvalid: true } }
