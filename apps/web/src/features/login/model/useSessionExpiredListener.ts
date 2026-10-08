import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { sessionKeys } from '@/entities/session'
import type { Session } from '@/entities/session'
import { sessionEvents } from '@/shared/api'
import { useLoginDialog } from './useLoginDialog.ts'

const GUEST: Session = { status: 'guest' }

/**
 * Любой `401` показывает панель входа поверх текущего раздела и переводит клиента в состояние гостя.
 * Локальные черновики (текст редактора и комментария) живут в состоянии экранов и не затрагиваются.
 */
export function useSessionExpiredListener(): void {
  const query_client = useQueryClient()
  const openLogin = useLoginDialog((state) => state.open)

  useEffect(() => {
    const stop_required = sessionEvents.on('login_required', () => openLogin('required'))
    const stop_expired = sessionEvents.on('expired', () => {
      // Гость остаётся гостем: диалог не перекрывает уже показанное объяснение.
      const was_member = query_client.getQueryData<Session>(sessionKeys.current())?.status === 'member'
      // Не инвалидируем запрос сессии: повторный 401 запустил бы цикл. Правду вернёт ближайшее чтение.
      query_client.setQueryData(sessionKeys.current(), GUEST)
      openLogin(was_member ? 'expired' : 'required')
    })
    return () => {
      stop_required()
      stop_expired()
    }
  }, [query_client, openLogin])
}
