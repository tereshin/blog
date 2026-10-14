import preview from '#.storybook/preview'
import { FieldCounter } from './FieldCounter.tsx'

function Frame() {
  return (
    <div className="relative h-12 w-64">
      <FieldCounter id="counter" remaining={12} />
    </div>
  )
}

const meta = preview.meta({ title: 'shared/ui/FieldCounter', component: Frame })
export const Default = meta.story({})
