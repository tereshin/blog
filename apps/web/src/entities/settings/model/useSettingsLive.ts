import { useQueryClient } from '@tanstack/react-query'
import { useLiveSignals } from '@/shared/api'
import { settingsKeys } from './settings-keys.ts'

/** Кадр `settings` заново читает публичные настройки. Статьи этот кадр не трогает. */
export function useSettingsLive(): void {
  const query_client = useQueryClient()
  const refresh = () => {
    void query_client.invalidateQueries({ queryKey: settingsKeys.public() })
  }
  useLiveSignals({
    subscribe: {},
    on: { settings: refresh },
    onReconnected: refresh,
  })
}
