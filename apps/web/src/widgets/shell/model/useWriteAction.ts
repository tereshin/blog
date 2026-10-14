import { useLocation, useNavigate } from 'react-router'
import { useViewer } from '@/entities/session'
import { useLoginDialogStore } from '@/features/login'
import { useT } from '@/shared/i18n'
import { useToast } from '@/shared/ui'
import { useShellStore } from './useShellStore.ts'

/** «Написать»: гостю — вход, без права публиковать — объяснение, иначе редактор поверх текущего раздела. */
export function useWriteAction(onWrite?: () => void): () => void {
  const { t } = useT()
  const { viewer } = useViewer()
  const openLogin = useLoginDialogStore((state) => state.open)
  const toast = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  const closeSearch = useShellStore((state) => state.closeSearch)

  return () => {
    if (viewer.status === 'loading') return
    if (viewer.status !== 'member') {
      openLogin('required')
      return
    }
    if (viewer.user.is_restricted) {
      toast.error(t('error.restricted'))
      return
    }
    if (!viewer.user.email_verified) {
      toast.error(t('login.email_unverified'))
      return
    }
    if (!viewer.user.can_publish) {
      toast.error(t('editor.cannot_publish'))
      return
    }
    if (onWrite) {
      onWrite()
      return
    }
    closeSearch()
    navigate('/write', { state: { editor_return_to: location.pathname + location.search + location.hash } })
  }
}
