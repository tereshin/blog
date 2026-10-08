import { sessionEvents } from '@/shared/api'
import { useT } from '@/shared/i18n'
import { Button, EmptyState } from '@/shared/ui'

type ArticleUnavailableProps = { status: 'members_only' | 'unavailable' }

/** Статью нельзя прочитать: объяснение в центре, каркас вокруг не трогаем. */
export function ArticleUnavailable({ status }: ArticleUnavailableProps) {
  const { t } = useT()
  if (status === 'members_only') {
    return (
      <EmptyState title={t('article.visibility.members')} description={t('article.unavailable')}>
        <Button variant="primary" onPress={() => sessionEvents.emit('login_required')}>
          {t('header.sign_in')}
        </Button>
      </EmptyState>
    )
  }
  return <EmptyState title={t('article.not_found')} description={t('article.unavailable')} />
}
