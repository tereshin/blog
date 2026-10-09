import type { Session, SessionProfile, SessionUser } from '../api/get-session.ts'

export type Viewer =
  | { status: 'loading' }
  | { status: 'guest' }
  | { status: 'member'; user: SessionUser; profile: SessionProfile }

export type ViewerHelpers = {
  viewer: Viewer
  is_loading: boolean
  is_guest: boolean
  is_admin: boolean
  is_superadmin: boolean
  is_own: (user_id: string) => boolean
}

/** Сводит ответ сессии к зрителю. Ошибка чтения сессии — гость: читать публичное это не мешает. */
export function toViewer(input: { session: Session | undefined; is_error: boolean }): Viewer {
  if (input.session?.status === 'member') return { status: 'member', user: input.session.user, profile: input.session.profile }
  if (input.session?.status === 'guest' || input.is_error) return { status: 'guest' }
  return { status: 'loading' }
}

/** Ограничение важнее неподтверждённой почты: текст отказа — про ограничение. */
export function memberMutationBlock(viewer: Viewer): 'restricted' | 'email_unverified' | null {
  if (viewer.status !== 'member') return null
  if (viewer.user.is_restricted) return 'restricted'
  if (!viewer.user.email_verified) return 'email_unverified'
  return null
}

export function deriveViewerHelpers(viewer: Viewer): ViewerHelpers {
  const role = viewer.status === 'member' ? viewer.user.role : null
  return {
    viewer,
    is_loading: viewer.status === 'loading',
    is_guest: viewer.status === 'guest',
    is_admin: role === 'admin' || role === 'superadmin',
    is_superadmin: role === 'superadmin',
    is_own: (user_id) => viewer.status === 'member' && viewer.user.id === user_id,
  }
}
