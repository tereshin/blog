import { useEffect } from 'react'
import { ArticleFeed } from '@/widgets/feed'
import { useShellStore } from '@/widgets/shell'

export default function PopularFeedPage() {
  const setHeaderCenter = useShellStore((state) => state.setHeaderCenter)

  useEffect(() => {
    setHeaderCenter({ kind: 'empty' })
  }, [setHeaderCenter])

  return <ArticleFeed mode="popular" />
}
