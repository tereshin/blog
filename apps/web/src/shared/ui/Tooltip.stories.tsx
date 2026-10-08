import type { Meta, StoryObj } from '@storybook/react-vite'
import { Button } from './Button.tsx'
import { Tooltip } from './Tooltip.tsx'

const meta = { title: 'shared/ui/Tooltip', component: Tooltip } satisfies Meta<typeof Tooltip>
export default meta
type Story = StoryObj

export const Default: Story = {
  render: () => (
    <Tooltip delay={0}>
      <Tooltip.Trigger>
        <Button>Наведите</Button>
      </Tooltip.Trigger>
      <Tooltip.Content>Подсказка</Tooltip.Content>
    </Tooltip>
  ),
}
