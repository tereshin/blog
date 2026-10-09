import { useQueryClient } from '@tanstack/react-query'
import { notificationKeys } from '@/entities/notification'
import { useLiveSignals } from '@/shared/api'

/** Кадр `notification` перечитывает список и счётчик, не дожидаясь перезагрузки. */
export function useNotificationLive(enabled: boolean): void {
  const query_client = useQueryClient()
  useLiveSignals({
    subscribe: { notifications: enabled },
    on: {
      notification: () => {
        void query_client.invalidateQueries({ queryKey: notificationKeys.all })
      },
    },
  })
}
