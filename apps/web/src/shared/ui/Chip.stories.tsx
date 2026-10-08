import type { Meta, StoryObj } from '@storybook/react-vite'
import { Chip } from './Chip.tsx'

const meta = { title: 'shared/ui/Chip', component: Chip, args: { children: 'Технологии' } } satisfies Meta<typeof Chip>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const Accent: Story = { args: { color: 'accent' } }
export const Success: Story = { args: { color: 'success', children: '+24' } }
