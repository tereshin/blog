import { Link } from 'react-router'
import { useViewer } from '@/entities/session'
import { useLoginDialogStore } from '@/features/login'
import { useT } from '@/shared/i18n'
import { Button, EmptyState, ErrorState, InboxIcon } from '@/shared/ui'
import { ArticleFeed, useFeed } from '@/widgets/feed'
import { useShellPage } from '@/widgets/shell'

export default function MyFeedPage() {
  const { t } = useT()
  const { viewer } = useViewer()
  const openLogin = useLoginDialogStore((state) => state.open)
  const is_member = viewer.status === 'member'
  const feed = useFeed('mine', is_member)

  useShellPage({ seen_feed: is_member ? 'mine' : null })

  if (viewer.status === 'guest') {
    return (
      <EmptyState title={t('feed.my_feed.guest')} description={t('feed.my_feed.guest_hint')} icon={<InboxIcon width={28} height={28} />} className="py-16">
        <Button variant="primary" onPress={() => openLogin('required')}>
          {t('header.sign_in')}
        </Button>
      </EmptyState>
    )
  }

  if (feed.status === 'error') return <ErrorState title={t('feed.load_error')} onRetry={feed.refetch} />
  if (feed.status === 'ok' && feed.reason === 'no_follows' && feed.article_ids.length === 0) {
    return (
      <EmptyState title={t('feed.my_feed.no_follows')} description={t('feed.my_feed.no_follows_hint')} icon={<InboxIcon width={28} height={28} />} className="py-16">
        <Link to="/popular" className="text-accent underline-offset-2 hover:underline">
          {t('shell.nav.popular')}
        </Link>
      </EmptyState>
    )
  }

  return <ArticleFeed mode="mine" />
}
