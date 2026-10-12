import type { Meta, StoryObj } from '@storybook/react-vite'
import { FormTextArea } from './FormTextArea.tsx'
const meta = {
  title: 'shared/FormTextArea',
  component: FormTextArea,
  args: {
    label: 'Название',
    defaultValue: 'Тестовый блог',
    maxLength: 100,
    hint: 'Название отображается в шапке сайта.',
  },
} satisfies Meta<typeof FormTextArea>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {}
export const Empty: Story = { args: { defaultValue: '', placeholder: 'Введите название' } }
export const Error: Story = { args: { error: 'Проверьте значение поля' } }
export const Disabled: Story = { args: { disabled: true } }
export const ReadOnly: Story = { args: { readOnly: true } }
export const WithoutLimit: Story = { args: { maxLength: undefined } }
