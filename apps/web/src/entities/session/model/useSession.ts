import { useQuery } from '@tanstack/react-query'
import { getSession } from '../api/get-session.ts'
import { sessionKeys } from './session-keys.ts'

/** Сессия живёт только в query-кэше: ни `localStorage`, ни `sessionStorage` (session-security.mdc). */
export function useSession() {
  return useQuery({
    queryKey: sessionKeys.current(),
    queryFn: ({ signal }) => getSession(signal),
  })
}
