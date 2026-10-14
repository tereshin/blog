import preview from '#.storybook/preview'
import { Button } from './Button.tsx'
import { Popover } from './Popover.tsx'

const meta = preview.meta({ title: 'shared/ui/Popover', component: Popover })
export const Default = meta.story({
  render: () => (
    <Popover>
      <Button>Подробнее</Button>
      <Popover.Content>
        <p className="p-3 text-sm">Всплывающее пояснение</p>
      </Popover.Content>
    </Popover>
  ),
})
