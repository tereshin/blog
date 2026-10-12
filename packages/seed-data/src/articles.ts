import { DAY_MS, at } from './anchor.ts'
import { attachesBlock, doc, excerptOf, firstImageOf, searchText } from './blocks.ts'
import { catalogByKey, entryBlocks, fillerCatalog } from './catalog.ts'
import { seedId } from './ids.ts'
import { mediaUrl } from './options.ts'
import type { SeedOptions } from './options.ts'
import { mulberry32, pick } from './prng.ts'
import { topicId } from './topics.ts'
import type { ArticleStatus, EditorBlock, SeedArticle, Visibility } from './types.ts'
import { userId } from './participants.ts'

export function articleId(key: string): string {
  return seedId('article', key)
}

export type ArticleInput = {
  key: string
  author_key: string
  topic_key: string
  title: string
  slug: string
  blocks: EditorBlock[]
  visibility?: Visibility
  status?: ArticleStatus
  comments_enabled?: boolean
  /** Смещение публикации от якоря (мс, отрицательное). У черновика — время создания. */
  offset_ms: number
}

export function makeArticle(input: ArticleInput, anchor: Date): SeedArticle {
  const status = input.status ?? 'published'
  const created_at = at(anchor, input.offset_ms - 2 * 60 * 60 * 1000)
  const published_at = status === 'draft' ? null : at(anchor, input.offset_ms)
  const document = doc(published_at ?? created_at, input.blocks)
  return {
    key: input.key,
    id: articleId(input.key),
    author_id: userId(input.author_key),
    topic_id: topicId(input.topic_key),
    title: input.title,
    slug: input.slug,
    blocks: document,
    visibility: input.visibility ?? 'public',
    comments_enabled: input.comments_enabled ?? true,
    status,
    published_at,
    created_at,
    updated_at: published_at ?? created_at,
    excerpt: excerptOf(document),
    first_image_url: firstImageOf(document),
    search_text: searchText(input.title, document),
  }
}

type NamedSlot = {
  key: string
  author_key: string
  slug: string
  visibility?: Visibility
  status?: ArticleStatus
  comments_enabled?: boolean
  /** Смещение публикации в днях назад от якоря. */
  offset_days: number
  attachment?: boolean
}

/** Состояния и адреса фиксированы. Текст и картинка берутся из каталога по ключу. */
const NAMED: readonly NamedSlot[] = [
  { key: 'published_long_with_image', author_key: 'author_a', slug: 'seed-long-interfaces', offset_days: 1 },
  { key: 'published_short', author_key: 'author_a', slug: 'seed-short-note', offset_days: 2 },
  { key: 'published_members_only', author_key: 'author_a', slug: 'seed-members-only', visibility: 'members', offset_days: 3 },
  { key: 'published_author_only', author_key: 'author_b', slug: 'seed-author-only', visibility: 'author', offset_days: 3.5 },
  { key: 'published_comments_off', author_key: 'author_b', slug: 'seed-comments-off', comments_enabled: false, offset_days: 4 },
  { key: 'published_with_attachment', author_key: 'author_a', slug: 'seed-with-attachment', offset_days: 5, attachment: true },
  { key: 'draft_author_only', author_key: 'author_a', slug: 'seed-draft', status: 'draft', offset_days: 6 },
  { key: 'hidden_by_moderator', author_key: 'author_b', slug: 'seed-hidden', status: 'hidden', offset_days: 7 },
  { key: 'deleted_by_author', author_key: 'author_a', slug: 'seed-deleted', status: 'deleted', offset_days: 8 },
  { key: 'published_promoted', author_key: 'author_b', slug: 'seed-promoted', offset_days: 20 },
  { key: 'published_promotion_expired', author_key: 'author_a', slug: 'seed-promotion-expired', offset_days: 21 },
  { key: 'published_in_archived_topic', author_key: 'author_b', slug: 'seed-archived-topic', offset_days: 40 },
  { key: 'published_by_admin', author_key: 'admin', slug: 'seed-admin-post', offset_days: 9 },
  { key: 'published_by_superadmin', author_key: 'superadmin', slug: 'seed-superadmin-post', offset_days: 10 },
]

/** Смысловые статьи малого набора: каждое состояние и вид доступа из таблицы покрытия. */
export function buildNamedArticles(anchor: Date, options: SeedOptions): SeedArticle[] {
  return NAMED.map((slot) => {
    const piece = catalogByKey(slot.key)
    const attachment: EditorBlock[] = slot.attachment
      ? [attachesBlock(mediaUrl(options, 'seed/attachment-spec.pdf'), 'Заметки с полки', 612, 'pdf')]
      : []
    return makeArticle(
      {
        key: slot.key,
        author_key: slot.author_key,
        topic_key: piece.topic_key,
        title: piece.title,
        slug: slot.slug,
        visibility: slot.visibility,
        status: slot.status,
        comments_enabled: slot.comments_enabled,
        offset_ms: -slot.offset_days * DAY_MS,
        blocks: [...entryBlocks(piece), ...attachment],
      },
      anchor,
    )
  })
}

const FILLER_AUTHORS = ['author_a', 'author_b', 'admin', 'superadmin'] as const
export const SMALL_FILLER_COUNT = 24

/** Рядовые опубликованные публичные статьи: наполняют ленту и темы. Ключ — `small:NNN`. */
export function buildFillerArticles(anchor: Date): SeedArticle[] {
  const random = mulberry32(20261008)
  return fillerCatalog(SMALL_FILLER_COUNT).map((piece, index) => {
    const number = index + 1
    const key = `small:${String(number).padStart(3, '0')}`
    return makeArticle(
      {
        key,
        author_key: pick(random, FILLER_AUTHORS),
        topic_key: piece.topic_key,
        title: piece.title,
        slug: `seed-small-${String(number).padStart(3, '0')}`,
        offset_ms: -(11 + number) * DAY_MS,
        blocks: entryBlocks(piece),
      },
      anchor,
    )
  })
}
