import { cn } from '@/shared/lib'
import { Button } from './Button.tsx'
import type { ButtonProps } from './Button.tsx'

/** Действие с круглой подсветкой иконки и отдельным счётчиком. */
export function ActionButton({ className, ...props }: Omit<ButtonProps, 'variant' | 'size'>) {
  return <Button {...props} variant="ghost" size="sm" className={cn('action-control', className as string | undefined)} />
}
