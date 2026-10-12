import { photoUrl } from './images.ts'
import type { PhotoKind } from './images.ts'
import type { SeedProfile, SeedUser } from './types.ts'

type ProfileShape = { slug: string | null; bio: string | null; cover: { kind: PhotoKind; u: number } | null }

/** Короткий адрес, описание и обложка по ключу: часть профилей с ними, часть без. */
const SHAPES: Record<string, ProfileShape> = {
  superadmin: { slug: 'seed-superadmin', bio: 'Слежу за площадкой и иногда пишу сама.', cover: { kind: 'landscape', u: 4 } },
  admin: { slug: 'seed-admin', bio: null, cover: null },
  author_a: { slug: 'seed-author-a', bio: 'Город, еда и вещи, которые хочется рассмотреть.', cover: { kind: 'landscape', u: 6 } },
  author_b: { slug: null, bio: 'Заметки о прогулках, фильмах и выходных.', cover: null },
  reader: { slug: null, bio: null, cover: null },
  no_publish: { slug: null, bio: 'Читаю и комментирую.', cover: null },
  restricted: { slug: 'seed-restricted', bio: null, cover: null },
  newcomer: { slug: null, bio: null, cover: null },
}

export function buildProfile(user: SeedUser): SeedProfile {
  const shape = SHAPES[user.key] ?? { slug: null, bio: null, cover: null }
  return {
    user_id: user.id,
    display_name: user.display_name,
    bio: shape.bio,
    avatar_url: user.avatar_url,
    cover_url: shape.cover ? photoUrl(shape.cover.kind, shape.cover.u) : null,
    slug: shape.slug,
  }
}

export function buildProfiles(users: readonly SeedUser[]): SeedProfile[] {
  return users.map((user) => buildProfile(user))
}
