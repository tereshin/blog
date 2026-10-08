import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { sessionKeys } from '@/entities/session'
import { sessionChannel } from './session-channel.ts'

/** Другие вкладки того же браузера становятся гостем, когда одна из них вышла. */
export function useSessionBroadcast(): void {
  const query_client = useQueryClient()

  useEffect(() => {
    const channel = sessionChannel()
    if (!channel) return
    const onMessage = (event: MessageEvent<unknown>) => {
      if (event.data !== 'logged_out') return
      query_client.setQueryData(sessionKeys.current(), { status: 'guest' })
      void query_client.invalidateQueries({ queryKey: sessionKeys.current() })
    }
    channel.addEventListener('message', onMessage)
    return () => channel.removeEventListener('message', onMessage)
  }, [query_client])
}
