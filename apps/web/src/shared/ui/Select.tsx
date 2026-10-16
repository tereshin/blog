import { Select as HeroSelect } from '@heroui/react/select'
import { FieldLabel } from './FieldLabel.tsx'
import { ListBox } from '@heroui/react/list-box'
import type { ComponentProps } from 'react'
import { cn } from '@/shared/lib'
import { fieldVariants } from './field-variants.ts'
import type { FieldAppearance } from './field-variants.ts'
export type SelectProps = Omit<
  ComponentProps<typeof HeroSelect>,
  'children' | 'onChange' | 'size' | 'variant'
> &
  FieldAppearance & {
    label?: string
    value?: string
    defaultValue?: string
    options: readonly { value: string; label: string }[]
    onChange?: (value: string) => void
    hint?: string
    error?: string
  }
export function Select({
  label,
  value,
  defaultValue,
  options,
  onChange,
  size = 'base',
  variant = 'primary',
  className,
  hint,
  error,
  ...props
}: SelectProps) {
  return (
    <HeroSelect
      {...props}
      selectedKey={value ?? props.selectedKey}
      defaultSelectedKey={defaultValue ?? props.defaultSelectedKey}
      isInvalid={Boolean(error) || props.isInvalid}
      onSelectionChange={(key) => {
        if (typeof key === 'string') onChange?.(key)
        props.onSelectionChange?.(key)
      }}
      className={cn(
        'w-full min-w-0',
        size === 'base' ? 'gap-2' : 'gap-3',
        className as string | undefined,
      )}
    >
      {label ? <FieldLabel size={size}>{label}</FieldLabel> : null}
      <HeroSelect.Trigger
        className={cn(
          fieldVariants({ size, variant }),
          'items-center py-0',
          size === 'lg' ? 'h-12' : 'h-10',
        )}
      >
        <HeroSelect.Value />
        <HeroSelect.Indicator />
      </HeroSelect.Trigger>
      <HeroSelect.Popover>
        <ListBox>
          {options.map((option) => (
            <ListBox.Item key={option.value} id={option.value} textValue={option.label}>
              {option.label}
              <ListBox.ItemIndicator />
            </ListBox.Item>
          ))}
        </ListBox>
      </HeroSelect.Popover>
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
    </HeroSelect>
  )
}
