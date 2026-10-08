import { mediaUrl } from './options.ts'
import type { SeedOptions } from './options.ts'
import type { SeedProfile, SeedUser } from './types.ts'

type ProfileShape = { slug: string | null; bio: string | null; has_cover: boolean }

/** Короткий адрес, описание и обложка по ключу: часть профилей с ними, часть без. */
const SHAPES: Record<string, ProfileShape> = {
  superadmin: { slug: 'seed-superadmin', bio: 'Настраиваю площадку и слежу за порядком.', has_cover: true },
  admin: { slug: 'seed-admin', bio: null, has_cover: false },
  author_a: { slug: 'seed-author-a', bio: 'Пишу про интерфейсы и инженерные практики.', has_cover: true },
  author_b: { slug: null, bio: 'Заметки о продукте и командах.', has_cover: false },
  reader: { slug: null, bio: null, has_cover: false },
  no_publish: { slug: null, bio: 'Читаю и комментирую.', has_cover: false },
  restricted: { slug: 'seed-restricted', bio: null, has_cover: false },
  newcomer: { slug: null, bio: null, has_cover: false },
}

export function buildProfile(user: SeedUser, options: SeedOptions): SeedProfile {
  const shape = SHAPES[user.key] ?? { slug: null, bio: null, has_cover: false }
  return {
    user_id: user.id,
    display_name: user.display_name,
    bio: shape.bio,
    avatar_url: user.avatar_url,
    cover_url: shape.has_cover ? mediaUrl(options, 'seed/cover-design.png') : null,
    slug: shape.slug,
  }
}

export function buildProfiles(users: readonly SeedUser[], options: SeedOptions): SeedProfile[] {
  return users.map((user) => buildProfile(user, options))
}
