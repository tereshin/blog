import { useT } from '@/shared/i18n'
import { cn } from '@/shared/lib'
import { Button } from './Button.tsx'
import { AlertIcon } from './icons.tsx'

type ErrorStateProps = {
  title: string
  description?: string
  /** Без обработчика кнопки «Повторить» нет. */
  onRetry?: () => void
  className?: string
}

/** Ошибка остаётся в том месте, где она случилась, и предлагает повторить. */
export function ErrorState({ title, description, onRetry, className }: ErrorStateProps) {
  const { t } = useT()
  return (
    <div role="alert" className={cn('flex flex-col items-center gap-2 px-4 py-10 text-center', className)}>
      <AlertIcon width={28} height={28} className="text-danger" />
      <p className="text-base font-medium text-foreground">{title}</p>
      {description ? <p className="max-w-sm text-sm text-muted">{description}</p> : null}
      {onRetry ? (
        <Button variant="secondary" onPress={onRetry} className="mt-2">
          {t('common.retry')}
        </Button>
      ) : null}
    </div>
  )
}
