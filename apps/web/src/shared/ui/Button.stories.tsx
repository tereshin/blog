import preview from '#.storybook/preview'
import { Button } from './Button.tsx'

const meta = preview.meta({ title: 'shared/ui/Button', component: Button, args: { children: 'Написать' } })
export const Primary = meta.story({ args: { variant: 'primary', shape: 'pill' } })
export const Secondary = meta.story({ args: { variant: 'secondary' } })
export const Ghost = meta.story({ args: { variant: 'ghost' } })
export const Danger = meta.story({ args: { variant: 'danger', children: 'Удалить' } })
export const Rounded = meta.story({ args: { variant: 'primary', shape: 'rounded' } })
export const Disabled = meta.story({ args: { variant: 'primary', isDisabled: true } })
