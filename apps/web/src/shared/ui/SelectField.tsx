import { Select } from './Select.tsx'
import type { SelectProps } from './Select.tsx'
export function SelectField(props: SelectProps) {
  return (
    <Select size="lg" variant="secondary" {...props} className={props.className ?? 'max-w-lg'} />
  )
}
