import { DEFAULT_SEED_OPTIONS, buildParticipants } from '@blog/seed-data'
import type { Env } from './config/env.ts'
import type { PickerParticipant } from './ui/pick-participant.ts'

export type MockParticipant = PickerParticipant & { sub: string; picture: string }

const ROLE_LABELS: Record<string, string> = { superadmin: 'суперадминистратор', admin: 'администратор', member: 'участник' }

/** Участники берутся из seed-data: `sub` и `email` совпадают с записями identity после seed. */
export function loadParticipants(env: Pick<Env, 'SUPERADMIN_EMAIL' | 'S3_PUBLIC_URL'>): MockParticipant[] {
  const options = {
    ...DEFAULT_SEED_OPTIONS,
    superadmin_email: env.SUPERADMIN_EMAIL,
    ...(env.S3_PUBLIC_URL ? { media_base_url: env.S3_PUBLIC_URL } : {}),
  }
  return buildParticipants(new Date(0), options).map((user) => ({
    key: user.key,
    sub: user.sub,
    email: user.email,
    display_name: user.display_name,
    role: ROLE_LABELS[user.role] ?? user.role,
    note: noteFor(user.key),
    picture: user.avatar_url,
  }))
}

function noteFor(key: string): string {
  switch (key) {
    case 'restricted':
      return 'ограничен модерацией'
    case 'no_publish':
      return 'без права публикации'
    case 'newcomer':
      return 'новый участник'
    case 'reader':
      return 'читатель'
    case 'author_a':
    case 'author_b':
      return 'автор'
    default:
      return ''
  }
}
