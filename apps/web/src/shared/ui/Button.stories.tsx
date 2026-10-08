import type { Meta, StoryObj } from '@storybook/react-vite'
import { Button } from './Button.tsx'

const meta = { title: 'shared/ui/Button', component: Button, args: { children: 'Написать' } } satisfies Meta<typeof Button>
export default meta
type Story = StoryObj<typeof meta>

export const Primary: Story = { args: { variant: 'primary', shape: 'pill' } }
export const Secondary: Story = { args: { variant: 'secondary' } }
export const Ghost: Story = { args: { variant: 'ghost' } }
export const Danger: Story = { args: { variant: 'danger', children: 'Удалить' } }
export const Rounded: Story = { args: { variant: 'primary', shape: 'rounded' } }
export const Disabled: Story = { args: { variant: 'primary', isDisabled: true } }
