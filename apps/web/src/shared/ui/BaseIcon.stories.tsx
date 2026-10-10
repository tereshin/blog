import type { Meta, StoryObj } from '@storybook/react-vite'
import { BaseIcon } from './BaseIcon.tsx'

const meta = {
  title: 'shared/ui/BaseIcon',
  component: BaseIcon,
  args: { name: 'happy', size: 24 },
} satisfies Meta<typeof BaseIcon>
export default meta
type Story = StoryObj<typeof BaseIcon>
export const Fill: Story = {}
export const Line: Story = { args: { style: 'line' } }
export const Labelled: Story = { args: { alt: 'Smile' } }
export const Large: Story = { args: { size: 48, className: 'text-accent' } }
export const Missing: Story = { args: { name: 'missing-icon' } }
