import preview from '#.storybook/preview'
import { BaseIcon } from './BaseIcon.tsx'

const meta = preview.meta({
  title: 'shared/ui/BaseIcon',
  component: BaseIcon,
  args: { name: 'happy', size: 24 },
})
export const Fill = meta.story()
export const Line = meta.story({ args: { style: 'line' } })
export const Labelled = meta.story({ args: { alt: 'Smile' } })
export const Large = meta.story({ args: { size: 48, className: 'text-accent' } })
export const Missing = meta.story({ args: { name: 'missing-icon' } })
