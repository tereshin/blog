import { Label } from '@heroui/react/label'
import type { ComponentProps } from 'react'
import { cn } from '@/shared/lib'
import type { FieldAppearance } from './field-variants.ts'
export function FieldLabel({
  size = 'lg',
  className,
  ...props
}: ComponentProps<typeof Label> & Pick<FieldAppearance, 'size'>) {
  return (
    <Label
      {...props}
      className={cn(
        'field-label',
        size === 'base' ? 'text-sm font-medium leading-5' : 'text-base font-semibold leading-6',
        className as string | undefined,
      )}
    />
  )
}
