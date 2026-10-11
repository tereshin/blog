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
      className="w-full"
    >
      <Label>{label}</Label>
      <Select.Trigger>
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
