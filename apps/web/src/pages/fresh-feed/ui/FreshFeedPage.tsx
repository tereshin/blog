import { useEffect } from 'react'
import { WelcomeCard } from '@/widgets/welcome'
import { ArticleFeed } from '@/widgets/feed'
import { useShellStore } from '@/widgets/shell'

export default function FreshFeedPage() {
  const setHeaderCenter = useShellStore((state) => state.setHeaderCenter)
  const markFeedSeen = useShellStore((state) => state.markFeedSeen)

  useEffect(() => {
    setHeaderCenter({ kind: 'empty' })
    markFeedSeen('fresh')
  }, [markFeedSeen, setHeaderCenter])

  return (
    <>
      <WelcomeCard />
      <ArticleFeed mode="fresh" />
    </>
  )
}
