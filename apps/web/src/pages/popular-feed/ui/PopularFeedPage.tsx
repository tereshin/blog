import { ArticleFeed } from '@/widgets/feed'
import { useShellPage } from '@/widgets/shell'

export default function PopularFeedPage() {
  useShellPage()

  return <ArticleFeed mode="popular" />
}
