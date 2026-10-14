import preview from '#.storybook/preview'
import { Skeleton } from './Skeleton.tsx'

const meta = preview.meta({ title: 'shared/ui/Skeleton', component: Skeleton })
export const Line = meta.story({ args: { shape: 'line' } })
export const Block = meta.story({ args: { shape: 'block' } })
export const Circle = meta.story({ args: { shape: 'circle' } })
