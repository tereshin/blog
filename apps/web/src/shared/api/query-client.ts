import { QueryClient } from '@tanstack/react-query'
import { ApiError } from './http-client.ts'

const STALE_TIME_MS = 30_000
const MAX_QUERY_RETRIES = 2

/** Повторяются только чтения (запросы query), и только сбои сети или сервера: 4xx повтор не лечит. */
export function shouldRetryQuery(failure_count: number, error: unknown): boolean {
  if (failure_count >= MAX_QUERY_RETRIES) return false
  if (error instanceof ApiError) return error.status === 0 || error.status >= 500
  return false
}

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { staleTime: STALE_TIME_MS, retry: shouldRetryQuery, refetchOnWindowFocus: false },
      // Мутации не повторяются автоматически: повтор — осознанное действие с тем же X-Idempotency-Key.
      mutations: { retry: false },
    },
  })
}
