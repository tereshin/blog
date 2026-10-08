import { DAY_MS, ANCHOR_OFFSETS, at } from './anchor.ts'
import { seedId } from './ids.ts'
import { mediaUrl } from './options.ts'
import type { SeedOptions } from './options.ts'
import type { Role, SeedUser } from './types.ts'

type ParticipantDef = {
  key: string
  display_name: string
  role: Role
  can_publish: boolean
  is_restricted: boolean
  /** Смещение `created_at` от якоря (мс). */
  created_offset_ms: number
}

/** Восемь участников малого набора (`contracts/seed.md`). Порядок задаёт публичные номера 1–8. */
export const PARTICIPANT_DEFS: readonly ParticipantDef[] = [
  { key: 'superadmin', display_name: 'Софья Суперова', role: 'superadmin', can_publish: true, is_restricted: false, created_offset_ms: -800 * DAY_MS },
  { key: 'admin', display_name: 'Адам Модератов', role: 'admin', can_publish: true, is_restricted: false, created_offset_ms: -700 * DAY_MS },
  { key: 'author_a', display_name: 'Анна Авторова', role: 'member', can_publish: true, is_restricted: false, created_offset_ms: ANCHOR_OFFSETS.member_one_year_created_at },
  { key: 'author_b', display_name: 'Борис Писарев', role: 'member', can_publish: true, is_restricted: false, created_offset_ms: -200 * DAY_MS },
  { key: 'reader', display_name: 'Роман Читаев', role: 'member', can_publish: true, is_restricted: false, created_offset_ms: -150 * DAY_MS },
  { key: 'no_publish', display_name: 'Нина Безправова', role: 'member', can_publish: false, is_restricted: false, created_offset_ms: -120 * DAY_MS },
  { key: 'restricted', display_name: 'Рита Ограничева', role: 'member', can_publish: true, is_restricted: true, created_offset_ms: -100 * DAY_MS },
  { key: 'newcomer', display_name: 'Наум Новиков', role: 'member', can_publish: true, is_restricted: false, created_offset_ms: ANCHOR_OFFSETS.member_newcomer_created_at },
]

export const PARTICIPANT_KEYS = PARTICIPANT_DEFS.map((def) => def.key)

export function userId(key: string): string {
  return seedId('user', key)
}

export function buildUser(
  def: ParticipantDef,
  public_number: number,
  anchor: Date,
  options: SeedOptions,
): SeedUser {
  return {
    key: def.key,
    id: userId(def.key),
    public_number,
    sub: `seed-sub-${def.key}`,
    email: def.key === 'superadmin' ? options.superadmin_email : `${def.key.replaceAll('_', '-')}@blog.test`,
    display_name: def.display_name,
    role: def.role,
    can_publish: def.can_publish,
    restricted_at: def.is_restricted ? at(anchor, -10 * DAY_MS) : null,
    created_at: at(anchor, def.created_offset_ms),
    avatar_url: mediaUrl(options, `seed/avatar-${def.key.replaceAll('_', '-')}.png`),
  }
}

export function buildParticipants(anchor: Date, options: SeedOptions): SeedUser[] {
  return PARTICIPANT_DEFS.map((def, index) => buildUser(def, index + 1, anchor, options))
}
