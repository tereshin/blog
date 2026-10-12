import { Label } from '@heroui/react/label'
import { ListBox } from '@heroui/react/list-box'
import { Select } from '@heroui/react/select'

type SelectFieldProps = {
  label: string
  value: string
  options: readonly { value: string; label: string }[]
  onChange: (value: string) => void
  isDisabled?: boolean
}

export function SelectField({ label, value, options, onChange, isDisabled }: SelectFieldProps) {
  return (
    <Select
      selectedKey={value}
      onSelectionChange={(key) => {
        if (typeof key === 'string') onChange(key)
      }}
      isDisabled={isDisabled}
      className="w-full max-w-lg gap-3"
    >
      <Label className="text-base font-semibold">{label}</Label>
      <Select.Trigger className="form-field h-12 w-full px-4 text-base">
        <Select.Value />
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover>
        <ListBox>
          {options.map((option) => (
            <ListBox.Item key={option.value} id={option.value} textValue={option.label}>
              {option.label}
              <ListBox.ItemIndicator />
            </ListBox.Item>
          ))}
        </ListBox>
      </Select.Popover>
    </Select>
  )
}
