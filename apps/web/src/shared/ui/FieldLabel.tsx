import { cva } from 'class-variance-authority'
import { Label } from '@heroui/react/label'
import type { ComponentProps } from 'react'
import { cn } from '@/shared/lib'
import type { FieldAppearance } from './field-variants.ts'

const label_class = cva('field-label', {
  variants: {
    size: {
      base: 'text-sm font-medium leading-5',
      lg: 'text-base font-semibold leading-6',
    },
  },
  defaultVariants: { size: 'lg' },
})
export function FieldLabel({
  size = 'lg',
  className,
  ...props
}: ComponentProps<typeof Label> & Pick<FieldAppearance, 'size'>) {
  return (
    <Label
      {...props}
      className={cn(
        label_class({ size }),
        className as string | undefined,
      )}
    />
  )
}
