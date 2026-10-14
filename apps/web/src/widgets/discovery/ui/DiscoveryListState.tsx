import type { ReactNode } from 'react'
import { useT } from '@/shared/i18n'
import { EmptyState, ErrorState, Skeleton } from '@/shared/ui'

type DiscoveryListStateProps = {
  is_pending: boolean
  is_error: boolean
  is_empty: boolean
  onRetry: () => void
  children: ReactNode
}

export function DiscoveryListState({
  is_pending,
  is_error,
  is_empty,
  onRetry,
  children,
}: DiscoveryListStateProps) {
  const { t } = useT()
  if (is_pending)
    return (
      <div role="status" aria-label={t('common.loading')}>
        <Skeleton className="my-4 h-12" />
        <Skeleton className="my-4 h-12" />
      </div>
    )
  if (is_error) return <ErrorState title={t('error.unknown')} onRetry={onRetry} />
  if (is_empty)
    return (
      <EmptyState
        title={t('discovery.empty')}
        className="min-h-0 bg-transparent py-6 shadow-none"
      />
    )
  return children
}
