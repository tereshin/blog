import type { Meta, StoryObj } from '@storybook/react-vite'
import { Avatar } from './Avatar.tsx'

const meta = { title: 'shared/ui/Avatar', component: Avatar, args: { name: 'Анна Авторова' } } satisfies Meta<typeof Avatar>
export default meta
type Story = StoryObj<typeof meta>

export const Initials: Story = {}
export const WithRing: Story = { args: { ring: 'accent' } }
export const Broken: Story = { args: { src: 'https://invalid.invalid/none.png' } }
