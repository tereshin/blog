import preview from '#.storybook/preview'
import { ToggleField } from './ToggleField.tsx'
const meta = preview.meta({
  title: 'shared/ToggleField',
  component: ToggleField,
  args: { label: 'Registration', is_selected: false, onChange: () => undefined },
})
export const Off = meta.story()
export const On = meta.story({ args: { is_selected: true } })
export const Disabled = meta.story({ args: { is_disabled: true } })
