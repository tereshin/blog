import { useT } from '@/shared/i18n'
import { cn } from '@/shared/lib'

type FieldCounterProps = { id: string; remaining: number; className?: string }
export function FieldCounter({ id, remaining, className }: FieldCounterProps) {
  const { t } = useT()
  return (
    <span
      id={id}
      className={cn('pointer-events-none absolute right-4 text-sm text-muted', className)}
    >
      <span className="sr-only">{t('form.characters_remaining', { count: remaining })}</span>
      <span aria-hidden="true">{remaining}</span>
    </span>
  )
}
