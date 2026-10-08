import { useQuery } from '@tanstack/react-query'
import { getProfileStats, profileKeys } from '@/entities/profile'
import { useT } from '@/shared/i18n'
import { formatCount } from '@/shared/lib'
import { Button, Dialog, ErrorState, Skeleton } from '@/shared/ui'

type StatsDialogProps = { is_open: boolean; onOpenChange: (is_open: boolean) => void }

export function StatsDialog({ is_open, onOpenChange }: StatsDialogProps) {
  const { t, locale } = useT()
  const stats = useQuery({ queryKey: profileKeys.stats(), queryFn: ({ signal }) => getProfileStats(signal), enabled: is_open })

  return (
    <Dialog is_open={is_open} onOpenChange={onOpenChange} size="sm">
      <Dialog.CloseTrigger />
      <Dialog.Header>
        <Dialog.Heading>{t('profile.stats_title')}</Dialog.Heading>
      </Dialog.Header>
      <Dialog.Body>
        {stats.isPending ? <Skeleton className="h-16 w-full" /> : null}
        {stats.isError ? <ErrorState title={t('error.unknown')} onRetry={() => void stats.refetch()} /> : null}
        {stats.data ? (
          <dl className="grid grid-cols-3 gap-3 text-center text-sm">
            <div>
              <dt className="text-muted">{t('profile.views')}</dt>
              <dd className="text-lg font-semibold">{formatCount(stats.data.view_count, locale)}</dd>
            </div>
            <div>
              <dt className="text-muted">{t('profile.reactions')}</dt>
              <dd className="text-lg font-semibold">{formatCount(stats.data.reaction_count, locale)}</dd>
            </div>
            <div>
              <dt className="text-muted">{t('profile.followers_title')}</dt>
              <dd className="text-lg font-semibold">{formatCount(stats.data.followers_count, locale)}</dd>
            </div>
          </dl>
        ) : null}
      </Dialog.Body>
      <Dialog.Footer>
        <Button variant="ghost" slot="close">
          {t('common.close')}
        </Button>
      </Dialog.Footer>
    </Dialog>
  )
}