import { FieldLabel } from './FieldLabel.tsx'
import { useId, useState } from 'react'
import type { ComponentProps } from 'react'
import { cn } from '@/shared/lib'
import { Textarea } from './Textarea.tsx'
import { FieldCounter } from './FieldCounter.tsx'

type FormTextAreaProps = ComponentProps<typeof Textarea> & {
  label: string
  hint?: string
  error?: string
}

export function FormTextArea({
  label,
  size = 'lg',
  hint,
  error,
  id,
  maxLength,
  value,
  defaultValue,
  onChange,
  className,
  'aria-describedby': described_by,
  ...props
}: FormTextAreaProps) {
  const generated_id = useId()
  const field_id = id ?? generated_id
  const [uncontrolled_length, setUncontrolledLength] = useState(
    () => String(defaultValue ?? '').length,
  )
  const length = value === undefined ? uncontrolled_length : String(value).length
  const description_ids =
    [
      described_by,
      hint ? `${field_id}-hint` : null,
      error ? `${field_id}-error` : null,
      maxLength === undefined ? null : `${field_id}-counter`,
    ]
      .filter(Boolean)
      .join(' ') || undefined
  return (
    <div
      className={cn('flex w-full min-w-0 max-w-lg flex-col', size === 'base' ? 'gap-2' : 'gap-3')}
    >
      <FieldLabel htmlFor={field_id} size={size}>
        {label}
      </FieldLabel>
      <div className="relative min-w-0">
        <Textarea
          size={size}
          variant="secondary"
          {...props}
          id={field_id}
          value={value}
          defaultValue={defaultValue}
          maxLength={maxLength}
          aria-invalid={error ? true : props['aria-invalid']}
          aria-describedby={description_ids}
          className={cn(
            'w-full min-h-28 resize-y',
            maxLength !== undefined && 'pb-9',
            className as string | undefined,
          )}
          onChange={(event) => {
            setUncontrolledLength(event.target.value.length)
            onChange?.(event)
          }}
        />
        {maxLength !== undefined ? (
          <FieldCounter
            id={`${field_id}-counter`}
            remaining={Math.max(0, maxLength - length)}
            className="bottom-3"
          />
        ) : null}
      </div>
      {hint ? (
        <p id={`${field_id}-hint`} className="text-sm leading-relaxed text-muted">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${field_id}-error`} role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
    </div>
  )
}
