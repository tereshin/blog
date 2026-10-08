import type { Meta, StoryObj } from '@storybook/react-vite'
import { Skeleton } from './Skeleton.tsx'

const meta = { title: 'shared/ui/Skeleton', component: Skeleton } satisfies Meta<typeof Skeleton>
export default meta
type Story = StoryObj<typeof meta>

export const Line: Story = { args: { shape: 'line' } }
export const Block: Story = { args: { shape: 'block' } }
export const Circle: Story = { args: { shape: 'circle' } }
