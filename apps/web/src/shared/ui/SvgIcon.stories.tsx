import preview from '#.storybook/preview'
import { SvgIcon } from './SvgIcon.tsx'

const SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="currentColor" d="M4 4h16v16H4z"/></svg>'
const meta = preview.meta({ title: 'shared/SvgIcon', component: SvgIcon, args: { svg: SVG, className: 'size-5 text-accent' } })
export const Small = meta.story({ args: { className: 'size-4' } })
export const Large = meta.story({ args: { className: 'size-6' } })
export const Empty = meta.story({ args: { svg: '' } })
export const Invalid = meta.story({ args: { svg: '<script>alert(1)</script>' } })
