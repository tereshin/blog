import preview from '#.storybook/preview'
import { Chip } from './Chip.tsx'

const meta = preview.meta({ title: 'shared/ui/Chip', component: Chip, args: { children: 'Технологии' } })
export const Default = meta.story()
export const Accent = meta.story({ args: { color: 'accent' } })
export const Success = meta.story({ args: { color: 'success', children: '+24' } })
