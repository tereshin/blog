import type { Meta, StoryObj } from '@storybook/react-vite'
import { ToggleField } from './ToggleField.tsx'
const meta = {
  title: 'shared/ToggleField',
  component: ToggleField,
  args: { label: 'Registration', isSelected: false, onChange: () => undefined },
} satisfies Meta<typeof ToggleField>
export default meta
type Story = StoryObj<typeof meta>
export const Off: Story = {}
export const On: Story = { args: { isSelected: true } }
export const Disabled: Story = { args: { isDisabled: true } }
