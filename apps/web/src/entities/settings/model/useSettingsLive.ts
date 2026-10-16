import { useEffect } from 'react'
import { sessionEvents } from '@/shared/api'
import { useQueryClient } from '@tanstack/react-query'
import { useLiveSignals } from '@/shared/api'
import { settingsKeys } from './settings-keys.ts'

/** Кадр `settings` заново читает публичные настройки. Статьи этот кадр не трогает. */
export function useSettingsLive(): void {
  const query_client = useQueryClient()
  const refresh = () => {
    void query_client.invalidateQueries({ queryKey: settingsKeys.public() })
  }
  useEffect(
    () =>
      sessionEvents.on('maintenance', () => {
        void query_client.invalidateQueries({ queryKey: settingsKeys.public() })
      }),
    [query_client],
  )
  useLiveSignals({
    subscribe: {},
    on: { settings: refresh },
    onReconnected: refresh,
  })
}
