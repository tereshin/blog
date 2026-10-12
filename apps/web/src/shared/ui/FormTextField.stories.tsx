import type { Meta, StoryObj } from '@storybook/react-vite'
import { FormTextField } from './FormTextField.tsx'
const meta = {
  title: 'shared/FormTextField',
  component: FormTextField,
  args: {
    label: 'Название',
    defaultValue: 'Тестовый блог',
    maxLength: 100,
    hint: 'Название отображается в шапке сайта.',
  },
} satisfies Meta<typeof FormTextField>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {}
export const Empty: Story = { args: { defaultValue: '', placeholder: 'Введите название' } }
export const Error: Story = { args: { error: 'Проверьте значение поля' } }
export const Disabled: Story = { args: { disabled: true } }
export const ReadOnly: Story = { args: { readOnly: true } }
export const WithoutLimit: Story = { args: { maxLength: undefined } }
