import type { Meta, StoryObj } from '@storybook/react-vite'
import { SelectField } from './SelectField.tsx'
const meta = {
  title: 'shared/SelectField',
  component: SelectField,
  args: {
    label: 'Language',
    value: 'ru',
    options: [
      { value: 'ru', label: 'Русский' },
      { value: 'en', label: 'English' },
    ],
    onChange: () => undefined,
  },
} satisfies Meta<typeof SelectField>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {}
export const Disabled: Story = { args: { isDisabled: true } }
