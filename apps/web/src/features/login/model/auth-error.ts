import type { LoginReason } from './useLoginDialog.ts'

const AUTH_ERROR_PARAM = 'auth_error'

/** Причина отказа из адреса возврата после входа (`/?auth_error=registration_closed`). */
export function readAuthError(search: string): LoginReason | null {
  const value = new URLSearchParams(search).get(AUTH_ERROR_PARAM)
  if (value === null) return null
  return value === 'registration_closed' || value === 'restricted' ? value : 'unknown_error'
}

export function stripAuthError(search: string): string {
  const params = new URLSearchParams(search)
  params.delete(AUTH_ERROR_PARAM)
  const rest = params.toString()
  return rest ? `?${rest}` : ''
}

/** `return_to` принимает только относительный путь этого origin: `//host` и схемы отбрасываются. */
export function toReturnPath(pathname: string, search: string, hash: string): string {
  const path = `${pathname}${stripAuthError(search)}${hash}`
  return path.startsWith('/') && !path.startsWith('//') ? path : '/'
}
