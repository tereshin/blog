import preview from '#.storybook/preview'
import { ColorPickerField } from './ColorPickerField.tsx'

const meta = preview.meta({ title: 'shared/ui/ColorPickerField', component: ColorPickerField })
export const Default = meta.story({
  args: { label: 'Accent', value: '#3366ff', onChange: () => undefined },
})
