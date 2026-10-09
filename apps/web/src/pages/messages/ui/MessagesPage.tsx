import { useEffect } from 'react'
import { useViewer } from '@/entities/session'
import { useLoginDialog } from '@/features/login'
import { useT } from '@/shared/i18n'
import { Button, EmptyState } from '@/shared/ui'
import { useShellStore } from '@/widgets/shell'

export default function MessagesPage() {
  const { t } = useT()
  const { viewer } = useViewer()
  const openLogin = useLoginDialog((state) => state.open)
  const setHeaderCenter = useShellStore((state) => state.setHeaderCenter)

  useEffect(() => {
    setHeaderCenter({ kind: 'pill' })
  }, [setHeaderCenter])

  if (viewer.status === 'guest') {
    return (
      <EmptyState title={t('messages.sign_in')} className="py-16">
        <Button variant="primary" onPress={() => openLogin('required')}>
          {t('header.sign_in')}
        </Button>
      </EmptyState>
    )
  }

  return <EmptyState title={t('shell.nav.messages')} className="py-16" />
}
