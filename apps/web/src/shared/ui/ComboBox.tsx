import { ComboBox as HeroComboBox } from '@heroui/react/combo-box'
import { Input as HeroInput } from '@heroui/react/input'
import { ListBox } from '@heroui/react/list-box'
import { ListLayout, Virtualizer } from 'react-aria-components/Virtualizer'
import { useState } from 'react'
import { FieldLabel } from './FieldLabel.tsx'
import { fieldVariants } from './field-variants.ts'

export type ComboBoxOption = { value: string; label: string }
type ComboBoxProps = {
  label: string
  value: string
  options: readonly ComboBoxOption[]
  onChange: (value: string) => void
  hint?: string
  error?: string
  is_disabled?: boolean
}

/** React Aria owns search, keyboard navigation and focus; long catalogs are virtualized. */
export function ComboBox({
  label,
  value,
  options,
  onChange,
  hint,
  error,
  is_disabled,
}: ComboBoxProps) {
  const [search, setSearch] = useState('')
  return (
    <HeroComboBox
      defaultItems={options}
      selectedKey={value}
      isDisabled={is_disabled}
      isInvalid={Boolean(error)}
      onInputChange={setSearch}
      menuTrigger="input"
      className="w-full min-w-0 max-w-lg"
      onSelectionChange={(key) => {
        if (typeof key === 'string') onChange(key)
      }}
    >
      <FieldLabel>{label}</FieldLabel>
      <HeroComboBox.InputGroup
        className={`${fieldVariants({ size: 'lg', variant: 'secondary' })} flex h-12 items-center gap-2`}
      >
        <HeroInput variant="secondary" className="form-control__input h-full min-w-0 flex-1" />
        <HeroComboBox.Trigger />
      </HeroComboBox.InputGroup>
      <HeroComboBox.Popover className="w-(--trigger-width) max-w-[calc(100vw-32px)] overflow-hidden">
        {/* A new filter starts at the top instead of retaining the selected row's old offset. */}
        <Virtualizer key={search} layout={ListLayout} layoutOptions={{ rowSize: 40, padding: 6 }}>
          <ListBox className="h-64 max-h-(--available-height) overflow-auto p-0">
            {(option: ComboBoxOption) => (
              <ListBox.Item id={option.value} textValue={option.label}>
                {option.label}
                <ListBox.ItemIndicator />
              </ListBox.Item>
            )}
          </ListBox>
        </Virtualizer>
      </HeroComboBox.Popover>
      {hint ? (
        <p slot="description" className="text-sm text-muted">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p slot="errorMessage" role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
    </HeroComboBox>
  )
}
