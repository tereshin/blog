import preview from '#.storybook/preview'
import { CloseButton } from './CloseButton.tsx'

const meta = preview.meta({ title: 'shared/ui/CloseButton', component: CloseButton })
export const Default = meta.story({ args: { 'aria-label': 'Close' } })
