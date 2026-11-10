import preview from '#.storybook/preview'
import { ComboBox } from './ComboBox.tsx'

const meta = preview.meta({
  title: 'shared/ComboBox',
  component: ComboBox,
  args: {
    label: 'Font',
    value: 'Inter',
    onChange: () => {},
    options: [
      { value: 'Inter', label: 'Inter' },
      { value: 'Roboto', label: 'Roboto' },
      { value: 'Noto Sans', label: 'Noto Sans' },
    ],
  },
})
export const Default = meta.story()
export const Disabled = meta.story({ args: { is_disabled: true } })
export const Invalid = meta.story({ args: { error: 'Choose a font from the list.' } })
