import { emptyResponseSchema, http } from '@/shared/api'

export async function logout(): Promise<void> {
  await http.delete('/v1/sessions/current', emptyResponseSchema)
}
