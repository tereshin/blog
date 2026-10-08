import { DAY_MS, at } from './anchor.ts'
import { attachesBlock, codeBlock, delimiterBlock, doc, excerptOf, firstImageOf, headerBlock, imageBlock, listBlock, paragraphBlock, quoteBlock, searchText } from './blocks.ts'
import { seedId } from './ids.ts'
import { mediaUrl } from './options.ts'
import type { SeedOptions } from './options.ts'
import { mulberry32, pick } from './prng.ts'
import { paragraph, title as randomTitle } from './text.ts'
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

/** Достаточно длинный текст, чтобы карточка предлагала «Показать полностью». */
function longBody(seed: string): EditorBlock[] {
  const random = mulberry32(seed.length * 7919 + seed.charCodeAt(0))
  return [
    paragraphBlock(paragraph(random, 4)),
    headerBlock('С чего всё началось'),
    paragraphBlock(paragraph(random, 5)),
    listBlock(['Сначала наблюдаем', 'Потом договариваемся', 'И только затем пишем код']),
    quoteBlock('Хорошее решение почти всегда скучное.', 'Из чужих заметок'),
    paragraphBlock(paragraph(random, 5)),
    codeBlock('const result = items.filter(Boolean).map(String)'),
    delimiterBlock(),
    paragraphBlock(paragraph(random, 5)),
  ]
}

function shortBody(seed: string): EditorBlock[] {
  return [paragraphBlock(paragraph(mulberry32(seed.length * 104729 + seed.charCodeAt(0)), 2))]
}

/** Смысловые статьи малого набора: каждое состояние и вид доступа из таблицы покрытия. */
export function buildNamedArticles(anchor: Date, options: SeedOptions): SeedArticle[] {
  const image = (name: string, caption: string): EditorBlock => imageBlock(mediaUrl(options, `seed/${name}.png`), caption)
  const day = DAY_MS
  const inputs: ArticleInput[] = [
    {
      key: 'published_long_with_image', author_key: 'author_a', topic_key: 'design', title: 'Длинный текст про интерфейсы',
      slug: 'seed-long-interfaces', offset_ms: -1 * day, blocks: [image('article-1', 'Схема экрана'), ...longBody('long')],
    },
    {
      key: 'published_short', author_key: 'author_a', topic_key: 'engineering', title: 'Короткая заметка',
      slug: 'seed-short-note', offset_ms: -2 * day, blocks: shortBody('short'),
    },
    {
      key: 'published_members_only', author_key: 'author_a', topic_key: 'product', title: 'Только для участников',
      slug: 'seed-members-only', visibility: 'members', offset_ms: -3 * day, blocks: shortBody('members'),
    },
    {
      key: 'published_author_only', author_key: 'author_b', topic_key: 'product', title: 'Видно автору и администратору',
      slug: 'seed-author-only', visibility: 'author', offset_ms: -3.5 * day, blocks: shortBody('author-only'),
    },
    {
      key: 'published_comments_off', author_key: 'author_b', topic_key: 'engineering', title: 'Без комментариев',
      slug: 'seed-comments-off', comments_enabled: false, offset_ms: -4 * day, blocks: shortBody('comments-off'),
    },
    {
      key: 'published_with_attachment', author_key: 'author_a', topic_key: 'engineering', title: 'Статья с вложением',
      slug: 'seed-with-attachment', offset_ms: -5 * day,
      blocks: [...shortBody('attachment'), attachesBlock(mediaUrl(options, 'seed/attachment-spec.pdf'), 'Спецификация', 612, 'pdf')],
    },
    {
      key: 'draft_author_only', author_key: 'author_a', topic_key: 'design', title: 'Черновик, который видит только автор',
      slug: 'seed-draft', status: 'draft', offset_ms: -6 * day, blocks: shortBody('draft'),
    },
    {
      key: 'hidden_by_moderator', author_key: 'author_b', topic_key: 'product', title: 'Скрыта модератором',
      slug: 'seed-hidden', status: 'hidden', offset_ms: -7 * day, blocks: shortBody('hidden'),
    },
    {
      key: 'deleted_by_author', author_key: 'author_a', topic_key: 'design', title: 'Удалённая статья',
      slug: 'seed-deleted', status: 'deleted', offset_ms: -8 * day, blocks: shortBody('deleted'),
    },
    {
      key: 'published_promoted', author_key: 'author_b', topic_key: 'product', title: 'Продвигаемая статья',
      slug: 'seed-promoted', offset_ms: -20 * day, blocks: [image('article-2', 'Обложка'), ...shortBody('promoted')],
    },
    {
      key: 'published_promotion_expired', author_key: 'author_a', topic_key: 'design', title: 'Продвижение закончилось',
      slug: 'seed-promotion-expired', offset_ms: -21 * day, blocks: shortBody('expired'),
    },
    {
      key: 'published_in_archived_topic', author_key: 'author_b', topic_key: 'archive', title: 'Старый материал из архивной темы',
      slug: 'seed-archived-topic', offset_ms: -40 * day, blocks: shortBody('archived'),
    },
    {
      key: 'published_by_admin', author_key: 'admin', topic_key: 'product', title: 'Объявление администратора',
      slug: 'seed-admin-post', offset_ms: -9 * day, blocks: shortBody('admin'),
    },
    {
      key: 'published_by_superadmin', author_key: 'superadmin', topic_key: 'engineering', title: 'Заметка суперадминистратора',
      slug: 'seed-superadmin-post', offset_ms: -10 * day, blocks: shortBody('superadmin'),
    },
  ]
  return inputs.map((input) => makeArticle(input, anchor))
}

const FILLER_AUTHORS = ['author_a', 'author_b', 'admin', 'superadmin'] as const
const ACTIVE_TOPICS = ['design', 'engineering', 'product'] as const
export const SMALL_FILLER_COUNT = 24

/** Рядовые опубликованные публичные статьи: наполняют ленту и темы. Ключ — `small:NNN`. */
export function buildFillerArticles(anchor: Date, options: SeedOptions): SeedArticle[] {
  const random = mulberry32(20261008)
  return Array.from({ length: SMALL_FILLER_COUNT }, (_, index) => {
    const number = index + 1
    const key = `small:${String(number).padStart(3, '0')}`
    const has_image = number % 4 === 0
    const body = shortBody(key)
    return makeArticle(
      {
        key,
        author_key: pick(random, FILLER_AUTHORS),
        topic_key: ACTIVE_TOPICS[index % ACTIVE_TOPICS.length] ?? 'design',
        title: randomTitle(random),
        slug: `seed-small-${String(number).padStart(3, '0')}`,
        offset_ms: -(11 + number) * DAY_MS,
        blocks: has_image ? [imageBlock(mediaUrl(options, `seed/article-${(number % 3) + 1}.png`), 'Иллюстрация'), ...body] : body,
      },
      anchor,
    )
  })
}
