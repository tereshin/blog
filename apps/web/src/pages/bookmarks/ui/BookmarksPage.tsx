import { useEffect } from 'react'
import { useT } from '@/shared/i18n'
import { EmptyState } from '@/shared/ui'
import { useShellStore } from '@/widgets/shell'

export default function BookmarksPage() {
  const { t } = useT()
  const setHeaderCenter = useShellStore((state) => state.setHeaderCenter)

  useEffect(() => {
    setHeaderCenter({ kind: 'pill' })
  }, [setHeaderCenter])

  return <EmptyState title={t('account.bookmarks')} className="py-16" />
}
