import preview from '#.storybook/preview'
import { SelectField } from './SelectField.tsx'
const meta = preview.meta({
  title: 'shared/SelectField',
  component: SelectField,
  args: {
    label: 'Language',
    value: 'ru',
    options: [
      { value: 'ru', label: 'Русский' },
      { value: 'en', label: 'English' },
    ],
    onChange: () => undefined,
  },
})
export const Default = meta.story()
export const Disabled = meta.story({ args: { isDisabled: true } })
