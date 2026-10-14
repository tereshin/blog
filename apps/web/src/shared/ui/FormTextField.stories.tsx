import preview from '#.storybook/preview'
import { FormTextField } from './FormTextField.tsx'
const meta = preview.meta({
  title: 'shared/FormTextField',
  component: FormTextField,
  args: {
    label: 'Название',
    defaultValue: 'Тестовый блог',
    maxLength: 100,
    hint: 'Название отображается в шапке сайта.',
  },
})
export const Default = meta.story()
export const Empty = meta.story({ args: { defaultValue: '', placeholder: 'Введите название' } })
export const Error = meta.story({ args: { error: 'Проверьте значение поля' } })
export const Disabled = meta.story({ args: { disabled: true } })
export const ReadOnly = meta.story({ args: { readOnly: true } })
export const WithoutLimit = meta.story({ args: { maxLength: undefined } })
