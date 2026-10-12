import { Input as HeroInput } from '@heroui/react/input'
import type { ComponentProps, ReactNode } from 'react'
import { cn } from '@/shared/lib'
import { fieldVariants } from './field-variants.ts'
import type { FieldAppearance } from './field-variants.ts'
export type InputProps = Omit<ComponentProps<typeof HeroInput>, 'size' | 'variant' | 'prefix'> &
  FieldAppearance & { prefix?: ReactNode; suffix?: ReactNode }
export function Input({
  size = 'base',
  variant = 'primary',
  prefix,
  suffix,
  className,
  ...props
}: InputProps) {
  const classes = cn(
    fieldVariants({ size, variant }),
    size === 'lg' ? 'h-12' : 'h-10',
    className as string | undefined,
  )
  if (!prefix && !suffix) return <HeroInput {...props} variant={variant} className={classes} />
  return (
    <div
      className={cn(classes, 'flex items-center gap-2')}
      data-disabled={props.disabled || undefined}
      data-readonly={props.readOnly || undefined}
      aria-invalid={props['aria-invalid']}
    >
      {prefix}
      <HeroInput
        {...props}
        variant={variant}
        className="form-control__input h-full min-w-0 flex-1"
      />
      {suffix}
    </div>
  )
}
