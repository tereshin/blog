import preview from '#.storybook/preview'
import { FieldLabel } from './FieldLabel.tsx'

const meta = preview.meta({ title: 'shared/ui/FieldLabel', component: FieldLabel })
export const Large = meta.story({ args: { children: 'Title', size: 'lg' } })
export const Base = meta.story({ args: { children: 'Hint', size: 'base' } })
