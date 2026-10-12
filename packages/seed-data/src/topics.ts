import { seedId } from './ids.ts'
import { photoUrl } from './images.ts'
import type { PhotoKind } from './images.ts'
import type { SeedTopic } from './types.ts'

type TopicDef = {
  key: string
  title: string
  description: string | null
  status: 'active' | 'archived'
  has_cover: boolean
  photo: PhotoKind
  photo_u: number
}

const DEFS: readonly TopicDef[] = [
  { key: 'design', title: 'Дизайн', description: 'Интерфейсы, типографика и визуальные решения', status: 'active', has_cover: true, photo: 'furniture', photo_u: 3 },
  { key: 'engineering', title: 'Инженерия', description: 'Архитектура, базы данных и эксплуатация', status: 'active', has_cover: false, photo: 'dashboard', photo_u: 2 },
  { key: 'product', title: 'Продукт', description: null, status: 'active', has_cover: false, photo: 'places', photo_u: 4 },
  { key: 'archive', title: 'Архив', description: 'Закрытая тема со старыми материалами', status: 'archived', has_cover: false, photo: 'book', photo_u: 4 },
]

export function topicId(key: string): string {
  return seedId('topic', key)
}

/** Три активные темы и одна архивная; адреса `seed-topic-*`. */
export function buildTopics(): SeedTopic[] {
  return DEFS.map((def, position) => ({
    key: def.key,
    id: topicId(def.key),
    title: def.title,
    description: def.description,
    avatar_url: photoUrl(def.photo, def.photo_u, 400, 400),
    cover_url: def.has_cover ? photoUrl('landscape', 1) : null,
    slug: `seed-topic-${def.key}`,
    status: def.status,
    position,
  }))
}

const LARGE_PHOTOS: readonly PhotoKind[] = ['landscape', 'food', 'sports', 'ai', 'finance']

/** Дополнительные активные темы большого набора. */
export function buildLargeTopics(first_position: number): SeedTopic[] {
  const titles = ['Данные', 'Безопасность', 'Фронтенд', 'Команды', 'Исследования']
  return titles.map((title, index) => {
    const key = `large-${String(index + 1).padStart(2, '0')}`
    const photo = LARGE_PHOTOS[index] ?? 'landscape'
    return {
      key,
      id: topicId(key),
      title,
      description: `Материалы по теме «${title}»`,
      avatar_url: photoUrl(photo, index + 5, 400, 400),
      cover_url: null,
      slug: `seed-topic-${key}`,
      status: 'active' as const,
      position: first_position + index,
    }
  })
}
