import { Link } from 'react-router'
import { useT } from '@/shared/i18n'
import { cn } from '@/shared/lib'
import { ArrowLeftIcon } from '@/shared/ui'
import { useShellStore } from '../model/useShellStore.ts'
import { getReturnTarget } from '../lib/feed-return.ts'

type HeaderBackLinkProps = {
  className?: string
}

/** Явный родитель раздела; без него — сохранённая лента или «Свежее». */
export function HeaderBackLink({ className }: HeaderBackLinkProps) {
  const { t } = useT()
  const explicit_target = useShellStore((state) => {
    const center =
      state.header_center.kind === 'search' ? state.previous_center : state.header_center
    return center.kind === 'back' ? center.to : undefined
  })
  const target = explicit_target ?? getReturnTarget().path
  return (
    <Link
      to={target}
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
