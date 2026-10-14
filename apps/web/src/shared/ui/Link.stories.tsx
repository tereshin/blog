import preview from '#.storybook/preview'
import { Link } from './Link.tsx'

const meta = preview.meta({ title: 'shared/ui/Link', component: Link })
export const Default = meta.story({ args: { children: 'Open profile', href: '#' } })
