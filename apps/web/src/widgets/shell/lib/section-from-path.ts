import type { SectionView } from './section-highlight.ts'

type SectionInput = {
  pathname: string
  /** Темы площадки: по ним `/t/{slug}` получает `topic_id`. */
  topics: ReadonlyArray<{ id: string; slug: string }>
  /** Тема загруженной статьи, пока открыта `/p/{slug}`. */
  article_topic_id: string | null
}

function decodeSegment(value: string | undefined): string {
  if (!value) return ''
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

/** Адрес → раздел из таблицы `contracts/sections.md`. Неизвестный адрес не подсвечивает никого (`about`). */
export function getSectionFromPath({ pathname, topics, article_topic_id }: SectionInput): SectionView {
  const [first, second, third] = pathname.split('/').filter(Boolean)
  switch (first) {
    case undefined:
      return { kind: 'fresh' }
    case 'popular':
      return { kind: 'popular' }
    case 'feed':
      return { kind: 'my_feed' }
    case 't': {
      const slug = decodeSegment(second)
      return { kind: 'topic', topic_id: topics.find((topic) => topic.slug === slug)?.id ?? null }
    }
    case 'p':
      return { kind: 'article', topic_id: article_topic_id }
    case 'u':
      return third === 'followers' ? { kind: 'followers' } : third === 'following' ? { kind: 'following' } : { kind: 'profile' }
    case 'messages':
      return { kind: 'messages' }
    case 'rating':
      return { kind: 'rating' }
    case 'bookmarks':
      return { kind: 'bookmarks' }
    case 'search':
      return { kind: 'search' }
    case 'write':
      return second ? { kind: 'write_edit' } : { kind: 'write' }
    case 'admin':
      return second === 'topics'
        ? { kind: 'admin_topics' }
        : second === 'settings'
          ? { kind: 'admin_settings' }
          : { kind: 'admin_moderation' }
    default:
      return { kind: 'about' }
  }
}
