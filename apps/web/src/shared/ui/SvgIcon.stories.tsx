import type { Meta, StoryObj } from '@storybook/react-vite'
import { SvgIcon } from './SvgIcon.tsx'

const SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="currentColor" d="M4 4h16v16H4z"/></svg>'
const meta = { title: 'shared/SvgIcon', component: SvgIcon, args: { svg: SVG, className: 'size-5 text-accent' } } satisfies Meta<typeof SvgIcon>
export default meta
type Story = StoryObj<typeof meta>
export const Small: Story = { args: { className: 'size-4' } }
export const Large: Story = { args: { className: 'size-6' } }
export const Empty: Story = { args: { svg: '' } }
export const Invalid: Story = { args: { svg: '<script>alert(1)</script>' } }
