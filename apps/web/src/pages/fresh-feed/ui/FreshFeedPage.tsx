import { WelcomeCard } from '@/widgets/welcome'
import { ArticleFeed } from '@/widgets/feed'
import { useShellPage } from '@/widgets/shell'

export default function FreshFeedPage() {
  useShellPage({ seen_feed: 'fresh' })

  return (
    <>
      <WelcomeCard />
      <ArticleFeed mode="fresh" />
    </>
  )
}
