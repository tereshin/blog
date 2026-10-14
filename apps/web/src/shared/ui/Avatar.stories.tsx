import preview from '#.storybook/preview'
import { Avatar } from './Avatar.tsx'

const meta = preview.meta({ title: 'shared/ui/Avatar', component: Avatar, args: { name: 'Анна Авторова' } })
export const Initials = meta.story()
export const WithRing = meta.story({ args: { ring: 'accent' } })
export const Broken = meta.story({ args: { src: 'https://invalid.invalid/none.png' } })
