import { cn } from '@/shared/lib'
import { Button } from '@/shared/ui'
import type { ButtonProps } from '@/shared/ui'

/** Компактная пилюля для реакции и кнопки добавления. */
export function ReactionButton({ className, ...props }: ButtonProps) {
  return <Button {...props} size="sm" className={cn('reaction-button', className as string | undefined)} />
}
