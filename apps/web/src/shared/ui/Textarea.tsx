import { TextArea as HeroTextarea } from '@heroui/react/textarea'
import type { ComponentProps } from 'react'
import { cn } from '@/shared/lib'
import { fieldVariants } from './field-variants.ts'
import type { FieldAppearance } from './field-variants.ts'
export type TextareaProps = Omit<ComponentProps<typeof HeroTextarea>, 'variant'> & FieldAppearance
export function Textarea({
  size = 'base',
  variant = 'primary',
  className,
  ...props
}: TextareaProps) {
  return (
    <HeroTextarea
      {...props}
      variant={variant}
      className={cn(
        fieldVariants({ size, variant }),
        size === 'lg' ? 'py-3' : 'py-2',
        className as string | undefined,
      )}
    />
  )
}
