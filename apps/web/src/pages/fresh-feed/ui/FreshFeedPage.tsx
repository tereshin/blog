import { useEffect } from 'react'
import { useShellStore } from '@/widgets/shell'
import { Feed } from '@/widgets/feed'

// Страница — только композиция: лента режима «Свежее» и пилюля в центре шапки.
export default function FreshFeedPage() {
  const setHeaderCenter = useShellStore((state) => state.setHeaderCenter)

  useEffect(() => {
    setHeaderCenter({ kind: 'pill' })
  }, [setHeaderCenter])

  return <Feed mode="fresh" />
}
