import { DAY_MS, at } from '../anchor.ts'
import { articleId, makeArticle } from '../articles.ts'
import { doc, imageBlock, paragraphBlock } from '../blocks.ts'
import { commentId } from '../comments.ts'
import { mediaUrl } from '../options.ts'
import type { SeedOptions } from '../options.ts'
import { buildUser } from '../participants.ts'
import { int, mulberry32, pick } from '../prng.ts'
import type { Prng } from '../prng.ts'
import { ReactionSet } from '../reactions.ts'
import { buildSlugs } from '../slugs.ts'
import { commentBody, paragraph, title } from '../text.ts'
import { buildLargeTopics } from '../topics.ts'
import { REACTION_KINDS } from '../types.ts'
import type { DatasetBody, SeedArticle, SeedBookmark, SeedComment, SeedFeedSeen, SeedFollow, SeedProfile, SeedUser, SeedView } from '../types.ts'
import { buildSmall } from './small.ts'

/** Зерно большого набора: менять нельзя — иначе состав разойдётся с уже заполненными базами. */
const LARGE_SEED = 20261008
const AUTHOR_COUNT = 12
const READER_COUNT = 60
const ARTICLE_COUNT = 520
const COMMENT_COUNT = 3200

const FIRST_NAMES = ['Алексей', 'Мария', 'Игорь', 'Ольга', 'Дмитрий', 'Елена', 'Сергей', 'Татьяна', 'Павел', 'Ирина']
const LAST_NAMES = ['Орлов', 'Лисова', 'Ветров', 'Громова', 'Зайцев', 'Крылова', 'Мартынов', 'Сафонова', 'Титов', 'Фролова']

function largeUsers(anchor: Date, options: SeedOptions, first_number: number, random: Prng): { users: SeedUser[]; profiles: SeedProfile[]; authors: SeedUser[]; readers: SeedUser[] } {
  const defs = [
    ...Array.from({ length: AUTHOR_COUNT }, (_, index) => `large-author-${String(index + 1).padStart(2, '0')}`),
    ...Array.from({ length: READER_COUNT }, (_, index) => `large-reader-${String(index + 1).padStart(3, '0')}`),
  ]
  const users = defs.map((key, index) => {
    const user = buildUser(
      { key, display_name: `${pick(random, FIRST_NAMES)} ${pick(random, LAST_NAMES)}`, role: 'member', can_publish: true, is_restricted: false, created_offset_ms: -int(random, 30, 700) * DAY_MS },
      first_number + index,
      anchor,
      options,
    )
    // Файлов под каждого нет: аватар берётся из общих.
    return { ...user, avatar_url: mediaUrl(options, 'seed/avatar-reader.png'), email: `${key}@blog.test` }
  })
  const profiles = users.map<SeedProfile>((user) => ({
    user_id: user.id, display_name: user.display_name, bio: null, avatar_url: user.avatar_url, cover_url: null, slug: null,
  }))
  return { users, profiles, authors: users.slice(0, AUTHOR_COUNT), readers: users.slice(AUTHOR_COUNT) }
}

/**
 * Большой набор — надмножество малого. Новое ссылается только на новые записи:
 * авторы статей и комментариев — новые участники, поэтому счётчики и репутация малого набора не меняются.
 * Реакции, закладки и просмотры могут ставить и участники малого набора.
 */
export function buildLarge(anchor: Date, options: SeedOptions): DatasetBody {
  const small = buildSmall(anchor, options)
  const random = mulberry32(LARGE_SEED)
  const { users, profiles, authors, readers } = largeUsers(anchor, options, small.users.length + 1, random)
  const topics = buildLargeTopics(options, small.topics.length)
  const active_topics = [...small.topics.filter((topic) => topic.status === 'active'), ...topics]
  const actors = [...small.users.filter((user) => user.restricted_at === null && user.key !== 'newcomer'), ...readers]

  const articles: SeedArticle[] = Array.from({ length: ARTICLE_COUNT }, (_, index) => {
    const number = String(index + 1).padStart(4, '0')
    const key = `large:${number}`
    const author = pick(random, authors)
    const topic = pick(random, active_topics)
    const offset_ms = -(int(random, 1, 400) * DAY_MS + int(random, 0, 23) * 3_600_000)
    const blocks = [paragraphBlock(paragraph(random, 3)), ...(index % 7 === 0 ? [paragraphBlock(paragraph(random, 4))] : [])]
    const article = makeArticle(
      { key, author_key: author.key, topic_key: topic.key, title: title(random), slug: `seed-large-${number}`, offset_ms, blocks: index % 6 === 0 ? [imageBlock(mediaUrl(options, `seed/article-${(index % 3) + 1}.png`), 'Иллюстрация'), ...blocks] : blocks },
      anchor,
    )
    // `makeArticle` берёт автора и тему по ключам малого набора: подставляем идентификаторы новых записей.
    return { ...article, id: articleId(key), author_id: author.id, topic_id: topic.id, blocks: doc(article.published_at ?? article.created_at, article.blocks.blocks) }
  })

  const comments: SeedComment[] = []
  const roots_by_article = new Map<string, SeedComment[]>()
  for (let index = 0; index < COMMENT_COUNT; index += 1) {
    const article = pick(random, articles)
    const roots = roots_by_article.get(article.id) ?? []
    const is_reply = roots.length > 0 && random() < 0.33
    const parent = is_reply ? pick(random, roots) : null
    const base_time = (parent?.created_at ?? article.published_at ?? anchor).getTime()
    const created_at = new Date(Math.min(base_time + int(random, 1, 72) * 3_600_000, anchor.getTime() - 60_000))
    const roll = random()
    const status = roll < 0.02 ? 'deleted' : roll < 0.04 ? 'hidden' : 'visible'
    const key = `large:${String(index + 1).padStart(5, '0')}`
    const comment: SeedComment = {
      key,
      id: commentId(key),
      article_id: article.id,
      author_id: pick(random, [...authors, ...readers]).id,
      parent_id: parent?.id ?? null,
      body: status === 'visible' ? commentBody(random) : '',
      status,
      edited_at: status === 'visible' && random() < 0.05 ? new Date(created_at.getTime() + 600_000) : null,
      created_at,
    }
    comments.push(comment)
    if (!parent) roots_by_article.set(article.id, [...roots, comment])
  }

  const reactions = new ReactionSet()
  const react = (target_type: 'article' | 'comment', target_id: string, user_id: string, created_at: Date): void => {
    try {
      reactions.add({ user_id, target_type, target_id, kind: pick(random, REACTION_KINDS), created_at })
    } catch {
      // Пара участник–объект уже занята — пропускаем: реакция на объект у участника одна.
    }
  }
  for (const article of articles) {
    if (random() >= 0.45) continue
    for (let count = int(random, 1, 6); count > 0; count -= 1) react('article', article.id, pick(random, actors).id, new Date((article.published_at ?? anchor).getTime() + 3_600_000))
  }
  for (const comment of comments) {
    if (comment.status !== 'visible' || random() >= 0.15) continue
    for (let count = int(random, 1, 3); count > 0; count -= 1) react('comment', comment.id, pick(random, actors).id, new Date(comment.created_at.getTime() + 600_000))
  }

  const bookmarks: SeedBookmark[] = []
  const bookmark_pairs = new Set<string>()
  for (const article of articles) {
    if (random() >= 0.08) continue
    const user = pick(random, actors)
    if (bookmark_pairs.has(`${user.id}:${article.id}`)) continue
    bookmark_pairs.add(`${user.id}:${article.id}`)
    bookmarks.push({ user_id: user.id, article_id: article.id, created_at: new Date((article.published_at ?? anchor).getTime() + 7_200_000) })
  }

  const views: SeedView[] = []
  for (const article of articles) {
    const viewers = new Set<string>()
    for (let count = int(random, 0, 12); count > 0; count -= 1) {
      viewers.add(random() < 0.3 ? `guest:large-${int(random, 1, 200)}` : `user:${pick(random, actors).id}`)
    }
    for (const viewer_key of viewers) views.push({ article_id: article.id, viewer_key, counted_at: new Date((article.published_at ?? anchor).getTime() + 5_400_000) })
  }

  const feed_seen: SeedFeedSeen[] = []
  for (const reader of readers.slice(0, 40)) {
    const seen = new Set<string>()
    for (let count = int(random, 3, 10); count > 0; count -= 1) seen.add(pick(random, articles).id)
    for (const article_id of seen) feed_seen.push({ viewer_key: `user:${reader.id}`, feed_key: 'fresh', article_id, seen_at: at(anchor, -int(random, 1, 72) * 3_600_000) })
  }

  const follows: SeedFollow[] = []
  for (const reader of readers) {
    const targets = new Set<string>()
    for (let count = int(random, 1, 3); count > 0; count -= 1) targets.add(pick(random, authors).id)
    for (const target_id of targets) follows.push({ follower_id: reader.id, target_type: 'user', target_id, created_at: at(anchor, -int(random, 1, 90) * DAY_MS) })
    follows.push({ follower_id: reader.id, target_type: 'topic', target_id: pick(random, active_topics).id, created_at: at(anchor, -int(random, 1, 90) * DAY_MS) })
  }

  const all_profiles = [...small.profiles, ...profiles]
  const all_topics = [...small.topics, ...topics]
  const all_articles = [...small.articles, ...articles]
  return {
    ...small,
    users: [...small.users, ...users],
    profiles: all_profiles,
    topics: all_topics,
    articles: all_articles,
    slugs: buildSlugs(all_profiles, all_topics, all_articles),
    follows: [...small.follows, ...follows],
    bookmarks: [...small.bookmarks, ...bookmarks],
    comments: [...small.comments, ...comments],
    reactions: [...small.reactions, ...reactions.items],
    views: [...small.views, ...views],
    feed_seen: [...small.feed_seen, ...feed_seen],
  }
}

