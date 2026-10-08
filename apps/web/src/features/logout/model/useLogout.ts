import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router'
import { emptyResponseSchema, http } from '@/shared/api'
import { sessionChannel } from './session-channel.ts'

export function postLoggedOut(): void {
  sessionChannel()?.postMessage('logged_out')
}

export function useLogout() {
  const query_client = useQueryClient()
  const navigate = useNavigate()

  return async () => {
    await http.post('/v1/auth/logout', emptyResponseSchema)
    query_client.clear()
    postLoggedOut()
    await navigate('/')
  }
}
