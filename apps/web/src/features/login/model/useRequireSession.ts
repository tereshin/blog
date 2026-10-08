import { useCallback } from 'react'
import { useViewer } from '@/entities/session'
import { useLoginDialog } from './useLoginDialog.ts'

/** `requireSession(action)`: участник выполняет действие, гость видит диалог входа поверх текущего раздела. */
export function useRequireSession(): (action: () => void) => void {
  const { viewer } = useViewer()
  const openLogin = useLoginDialog((state) => state.open)
  const is_member = viewer.status === 'member'
  return useCallback(
    (action) => {
      if (is_member) action()
      else openLogin('required')
    },
    [is_member, openLogin],
  )
}
