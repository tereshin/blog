import preview from '#.storybook/preview'
import { Button } from './Button.tsx'
import { Tooltip } from './Tooltip.tsx'

const meta = preview.meta({ title: 'shared/ui/Tooltip', component: Tooltip })
export const Default = meta.story({
  render: () => (
    <Tooltip delay={0}>
      <Tooltip.Trigger>
        <Button>Наведите</Button>
      </Tooltip.Trigger>
      <Tooltip.Content>Подсказка</Tooltip.Content>
    </Tooltip>
  ),
})
