/** Раздел внутри каркаса (контракт `sections.md`): по нему выбирается подложка пункта навигации. */
export type SectionView =
  | { kind: 'fresh' }
  | { kind: 'popular' }
  | { kind: 'my_feed' }
  | { kind: 'topic'; topic_id: string | null }
  | { kind: 'article'; topic_id: string | null }
  | { kind: 'profile' }
  | { kind: 'followers' }
  | { kind: 'following' }
  | { kind: 'messages' }
  | { kind: 'rating' }
  | { kind: 'bookmarks' }
  | { kind: 'search' }
  | { kind: 'about' }
  | { kind: 'write' }
  | { kind: 'write_edit' }
  | { kind: 'admin_moderation' }
  | { kind: 'admin_topics' }
  | { kind: 'admin_settings' }

export type HighlightedItem =
  | { kind: 'popular' | 'fresh' | 'mine' | 'messages' | 'rating' }
  | { kind: 'topic'; topic_id: string }

/**
 * Какой пункт левой карточки выделен на этом разделе. Остальные разделы не подсвечивают никого;
 * тема, которой нет среди активных (архивная, неизвестная), тоже никого не подсвечивает.
 */
export function getHighlightedItem(section: SectionView, active_topic_ids: readonly string[]): HighlightedItem | null {
  switch (section.kind) {
    case 'fresh':
    case 'popular':
    case 'messages':
    case 'rating':
      return { kind: section.kind }
    case 'my_feed':
      return { kind: 'mine' }
    case 'topic':
    case 'article':
      return section.topic_id !== null && active_topic_ids.includes(section.topic_id)
        ? { kind: 'topic', topic_id: section.topic_id }
        : null
    case 'profile':
    case 'followers':
    case 'following':
    case 'bookmarks':
    case 'search':
    case 'about':
    case 'write':
    case 'write_edit':
    case 'admin_moderation':
    case 'admin_topics':
    case 'admin_settings':
      return null
  }
}
