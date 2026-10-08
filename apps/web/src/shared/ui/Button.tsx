import { Button as HeroButton } from '@heroui/react/button'
import type { ButtonProps as HeroButtonProps } from '@heroui/react/button'
import { cva } from 'class-variance-authority'
import type { VariantProps } from 'class-variance-authority'
import { cn } from '@/shared/lib'

// Цвета и состояния даёт HeroUI (`primary` — синий акцент); здесь только форма.
const button_variants = cva('', {
  variants: {
    shape: { pill: 'rounded-pill', rounded: 'rounded-xl' },
  },
  defaultVariants: { shape: 'pill' },
})

export type ButtonProps = Omit<HeroButtonProps, 'variant'> &
  VariantProps<typeof button_variants> & { variant?: 'primary' | 'secondary' | 'ghost' | 'danger' }

export function Button({ variant = 'secondary', shape, className, ...rest }: ButtonProps) {
  return <HeroButton variant={variant} className={cn(button_variants({ shape }), className as string | undefined)} {...rest} />
}
