import { NotFoundError, RestrictedError, UnauthorizedError, ValidationError } from '@blog/errors'
import type { Profile, ProfileBadge, ServiceContext, UpdateProfile } from '@blog/contracts'
import type { ProfileRecord, ProfileRepository, ProfileService } from './profile.types.ts'

const PUBLIC_NUMBER = /^[1-9]\d*$/

function badgesOf(row: ProfileRecord, now: Date): ProfileBadge[] {
  const badges: ProfileBadge[] = []
  if (row.has_published) badges.push('first_post')
  if (row.reputation >= 10) badges.push('ten_reactions')
  const anniversary = new Date(row.created_at)
  anniversary.setUTCFullYear(anniversary.getUTCFullYear() + 1)
  if (anniversary <= now) badges.push('one_year')
  return badges
}

export function toProfile(row: ProfileRecord, viewer: ServiceContext, now: Date): Profile {
  return {
    user_id: row.user_id,
    public_number: row.public_number,
    display_name: row.display_name,
    bio: row.bio,
    avatar_url: row.avatar_url,
    cover_url: row.cover_url,
    slug: row.slug,
    reputation: row.reputation,
    created_at: row.created_at.toISOString(),
    followers_count: Number(row.followers_count),
    following_count: Number(row.following_count),
    badges: badgesOf(row, now),
    is_own: viewer.user_id === row.user_id,
    is_following: row.is_following,
  }
}

function assertOwnedUrl(value: string | null, bases: readonly string[], field: string): void {
  if (value === null) return
  let parsed: URL
  try {
    parsed = new URL(value)
  } catch {
    throw new ValidationError({ message: 'Адрес изображения не подходит', details: { field } })
  }
  const allowed = bases.some((base) => parsed.origin === new URL(base).origin)
  if (!allowed) throw new ValidationError({ message: 'Изображение должно быть загружено на площадку', details: { field, reason: 'media_url' } })
}

export function createProfileService(
  repository: ProfileRepository,
  options: { media_bases: readonly string[]; now?: () => Date },
): ProfileService {
  const now = options.now ?? (() => new Date())

  return {
    async getBySlug(viewer, slug) {
      const by_slug = await repository.findBySlug(slug, viewer.user_id)
      const row = by_slug ?? (PUBLIC_NUMBER.test(slug) ? await repository.findByPublicNumber(Number(slug), viewer.user_id) : null)
      if (!row) throw new NotFoundError({ message: 'Профиль не найден' })
      return toProfile(row, viewer, now())
    },

    async updateMe(viewer, input: UpdateProfile, correlation_id) {
      if (!viewer.user_id) throw new UnauthorizedError()
      if (viewer.is_restricted) throw new RestrictedError()
      const bio = input.bio === '' ? null : input.bio
      const next = { ...input, bio }
      assertOwnedUrl(next.avatar_url, options.media_bases, 'avatar_url')
      assertOwnedUrl(next.cover_url, options.media_bases, 'cover_url')
      const row = await repository.update(viewer.user_id, next, correlation_id)
      if (!row) throw new NotFoundError({ message: 'Профиль не найден' })
      return toProfile(row, viewer, now())
    },
  }
}
