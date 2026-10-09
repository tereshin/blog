import type { FeedCardFixture } from '../fixtures/feed.ts'
import { currentMockAuthor } from './articles-store.ts'

const COMMENT_KEY = 'mock_discussion_comments'
const VIEW_KEY = 'mock_discussion_views'
const WINDOW_MS = 30 * 60 * 1000

type Kind = 'laugh' | 'heart' | 'thumb' | 'fire'

export type StoredComment = {
  id: string
  article_id: string
  parent_id: string | null
  author: { user_id: string; display_name: string; avatar_url: string | null }
  body: string
  status: 'visible' | 'deleted' | 'hidden'
  edited_at: string | null
  reaction_counts: Record<Kind, number>
  /** Реакция зрителя: ключ — id участника. */
  reactions: Record<string, Kind>
  created_at: string
}

type StoredView = { article_id: string; viewer_key: string; counted_at: number; times: number }

function readJson<T>(storage: Storage, key: string): T[] {
  try {
    const raw = storage.getItem(key)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as T[]) : []
  } catch {
    return []
  }
}

export function readStoredComments(): StoredComment[] {
  return readJson<StoredComment>(window.localStorage, COMMENT_KEY)
}

function writeComments(comments: StoredComment[]): void {
  window.localStorage.setItem(COMMENT_KEY, JSON.stringify(comments))
}

export function commentsForArticle(article: FeedCardFixture): StoredComment[] {
  const all = readStoredComments()
  if (all.some((comment) => comment.article_id === article.id)) return all.filter((comment) => comment.article_id === article.id)
  if (!article.top_comment || article.comment_count === 0) return []
  const seeded: StoredComment = {
    id: article.top_comment.id,
    article_id: article.id,
    parent_id: null,
    author: { user_id: 'a1000000-0000-4000-8000-000000000002', display_name: article.top_comment.author_name, avatar_url: null },
    body: article.top_comment.excerpt,
    status: 'visible',
    edited_at: null,
    reaction_counts: { laugh: 1, heart: 0, thumb: 0, fire: 0 },
    reactions: {},
    created_at: article.published_at,
  }
  writeComments([...all, seeded])
  return [seeded]
}

export function saveComment(comment: StoredComment): void {
  const all = readStoredComments().filter((item) => item.id !== comment.id)
  writeComments([...all, comment])
}

export function patchStoredComment(comment_id: string, patch: Partial<StoredComment>): StoredComment | null {
  const all = readStoredComments()
  const current = all.find((item) => item.id === comment_id)
  if (!current) return null
  const next = { ...current, ...patch }
  writeComments(all.map((item) => (item.id === comment_id ? next : item)))
  return next
}

function occupies(comment: StoredComment, all: readonly StoredComment[]): boolean {
  return comment.status === 'visible' || all.some((item) => item.parent_id === comment.id && item.status === 'visible')
}

export function commentTree(article: FeedCardFixture, viewer_id: string | null) {
  const rows = commentsForArticle(article)
  const toNode = (row: StoredComment) => ({
    id: row.id,
    author: row.author,
    body: row.status === 'visible' ? row.body : null,
    status: row.status,
    edited_at: row.edited_at,
    reaction_counts: row.reaction_counts,
    reaction_count: Object.values(row.reaction_counts).reduce((sum, count) => sum + count, 0),
    my_reaction: viewer_id ? (row.reactions[viewer_id] ?? null) : null,
    created_at: row.created_at,
  })
  const roots = rows.filter((row) => row.parent_id === null && occupies(row, rows))
  return {
    comments: roots.map((root) => ({
      ...toNode(root),
      replies: rows.filter((row) => row.parent_id === root.id && occupies(row, rows)).map((reply) => toNode(reply)),
    })),
    next_cursor: null,
  }
}

export function recordMockView(article: FeedCardFixture, viewer_key: string, is_author: boolean, is_moderation: boolean): { counted: boolean; view_count: number } {
  const rows = readJson<StoredView>(window.sessionStorage, VIEW_KEY)
  const extra = rows.filter((row) => row.article_id === article.id).reduce((sum, row) => sum + row.times, 0)
  if (is_author || is_moderation) return { counted: false, view_count: article.view_count + extra }
  const now = Date.now()
  const current = rows.find((row) => row.article_id === article.id && row.viewer_key === viewer_key)
  if (current && now - current.counted_at < WINDOW_MS) return { counted: false, view_count: article.view_count + extra }
  const next = current ? { ...current, counted_at: now, times: current.times + 1 } : { article_id: article.id, viewer_key, counted_at: now, times: 1 }
  const saved = current ? rows.map((row) => (row === current ? next : row)) : [...rows, next]
  window.sessionStorage.setItem(VIEW_KEY, JSON.stringify(saved))
  return { counted: true, view_count: article.view_count + extra + (current ? 1 : 1) }
}

export function mockViewerId(): string | null {
  return currentMockAuthor()?.id ?? null
}
