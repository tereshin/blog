import preview from '#.storybook/preview'
import { FallbackImage } from './FallbackImage.tsx'

const meta = preview.meta({ title: 'shared/ui/FallbackImage', component: FallbackImage })
export const Loaded = meta.story({
  args: {
    src: 'data:image/svg+xml;utf8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2248%22 height=%2248%22%3E%3Crect width=%2248%22 height=%2248%22 fill=%22%23566%22/%3E%3C/svg%3E',
    label: 'Cover',
    className: 'size-12',
  },
})
export const Broken = meta.story({ args: { src: '', label: 'Cover' } })
export const CustomFallback = meta.story({ args: { src: '', label: 'Cover', fallback: null } })
