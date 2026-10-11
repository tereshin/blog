import { Link } from 'react-router'
import { useT } from '@/shared/i18n'
import { cn } from '@/shared/lib'
import { ArrowLeftIcon } from '@/shared/ui'
import { getReturnTarget } from '../lib/feed-return.ts'

type HeaderBackLinkProps = {
  className?: string
}

/** «Назад» ведёт в сохранённую ленту или в «Свежее», если статью открыли прямой ссылкой. */
export function HeaderBackLink({ className }: HeaderBackLinkProps) {
  const { t } = useT()
  const target = getReturnTarget()
  return (
    <Link
      to={target.path}
      aria-label={t('header.back')}
      className={cn(
        'inline-flex size-9 shrink-0 items-center justify-center rounded-md text-foreground outline-offset-2 hover:bg-surface-secondary',
        className,
      )}
    >
      <ArrowLeftIcon className="size-6" />
    </Link>
  )
}
