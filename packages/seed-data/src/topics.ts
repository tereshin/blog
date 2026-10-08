import { seedId } from './ids.ts'
import { mediaUrl } from './options.ts'
import type { SeedOptions } from './options.ts'
import type { SeedTopic } from './types.ts'

type TopicDef = { key: string; title: string; description: string | null; status: 'active' | 'archived'; has_cover: boolean }

const DEFS: readonly TopicDef[] = [
  { key: 'design', title: 'Дизайн', description: 'Интерфейсы, типографика и визуальные решения', status: 'active', has_cover: true },
  { key: 'engineering', title: 'Инженерия', description: 'Архитектура, базы данных и эксплуатация', status: 'active', has_cover: false },
  { key: 'product', title: 'Продукт', description: null, status: 'active', has_cover: false },
  { key: 'archive', title: 'Архив', description: 'Закрытая тема со старыми материалами', status: 'archived', has_cover: false },
]

export function topicId(key: string): string {
  return seedId('topic', key)
}

/** Три активные темы и одна архивная; адреса `seed-topic-*`. */
export function buildTopics(options: SeedOptions): SeedTopic[] {
  return DEFS.map((def, position) => ({
    key: def.key,
    id: topicId(def.key),
    title: def.title,
    description: def.description,
    avatar_url: mediaUrl(options, `seed/topic-${def.key}.png`),
    cover_url: def.has_cover ? mediaUrl(options, 'seed/cover-design.png') : null,
    slug: `seed-topic-${def.key}`,
    status: def.status,
    position,
  }))
}

/** Дополнительные активные темы большого набора. */
export function buildLargeTopics(options: SeedOptions, first_position: number): SeedTopic[] {
  const titles = ['Данные', 'Безопасность', 'Фронтенд', 'Команды', 'Исследования']
  return titles.map((title, index) => {
    const key = `large-${String(index + 1).padStart(2, '0')}`
    return {
      key,
      id: topicId(key),
      title,
      description: `Материалы по теме «${title}»`,
      avatar_url: mediaUrl(options, 'seed/topic-design.png'),
      cover_url: null,
      slug: `seed-topic-${key}`,
      status: 'active' as const,
      position: first_position + index,
    }
  })
}
