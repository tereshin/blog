import type { Meta, StoryObj } from '@storybook/react-vite'
import { Button } from './Button.tsx'
import { Popover } from './Popover.tsx'

const meta = { title: 'shared/ui/Popover', component: Popover } satisfies Meta<typeof Popover>
export default meta
type Story = StoryObj

export const Default: Story = {
  render: () => (
    <Popover>
      <Button>Подробнее</Button>
      <Popover.Content>
        <p className="p-3 text-sm">Всплывающее пояснение</p>
      </Popover.Content>
    </Popover>
  ),
}
