import { ADMIN_ROUTES, getAdminRoute } from './admin-navigation.ts'

/** Accept only known moderation screens from untrusted history state. */
export function getModerationReturnTo(state: unknown): string {
  if (typeof state === 'object' && state !== null && 'moderation_return_to' in state) {
    const candidate = state.moderation_return_to
    if (typeof candidate === 'string' && getAdminRoute(candidate)?.parent === 'moderation')
      return candidate
  }
  return ADMIN_ROUTES.articles.path
}

export function createModerationReturnState(pathname: string): { moderation_return_to: string } {
  return { moderation_return_to: getModerationReturnTo({ moderation_return_to: pathname }) }
}
