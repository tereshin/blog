import type { CommentSort } from '@blog/contracts'
import { ValidationError } from '@blog/errors'
import {
  decodeCommentCursor,
  decodeUserCommentCursor,
  encodeCommentCursor,
  encodeUserCommentCursor,
} from './comment.schema.ts'
import type { CommentCursor, UserCommentCursor } from './comment.schema.ts'
import type { CommentRow } from './comment.tree.ts'

/** Курсор действителен только для той же сортировки и того же обсуждения, где он выдан. */
export function parseCommentCursor(
  value: string | undefined,
  sort: CommentSort,
  scope: string,
): CommentCursor | null {
  if (!value) return null
  try {
    const cursor = decodeCommentCursor(value)
    if (
      (cursor.sort ?? 'oldest') !== sort ||
      (cursor.scope && cursor.scope !== scope) ||
      (sort === 'best' && cursor.score === undefined)
    )
      throw new Error('Cursor scope mismatch')
    return cursor
  } catch (cause) {
    throw new ValidationError({ message: 'Некорректный курсор', cause })
  }
}

export function nextCommentCursor(
  rows: CommentRow[],
  limit: number,
  sort: CommentSort,
  scope: string,
): string | null {
  const last = rows.slice(0, limit).at(-1)
  return rows.length > limit && last
    ? encodeCommentCursor({
        t: last.created_at.toISOString(),
        id: last.id,
        sort,
        scope,
        ...(sort === 'best' ? { score: last.reaction_count } : {}),
      })
    : null
}

export function parseUserCommentCursor(value: string | undefined): UserCommentCursor | null {
  if (!value) return null
  try {
    return decodeUserCommentCursor(value)
  } catch (error) {
    throw new ValidationError({ message: 'Некорректный курсор', cause: error })
  }
}

export function nextUserCommentCursor(
  rows: { id: string; reaction_count: number; created_at: Date }[],
  limit: number,
  sort: 'fresh' | 'popular',
): string | null {
  const last = rows.slice(0, limit).at(-1)
  if (rows.length <= limit || !last) return null
  return encodeUserCommentCursor(
    sort === 'popular'
      ? { k: 'score', s: last.reaction_count, id: last.id }
      : { k: 'time', t: last.created_at.toISOString(), id: last.id },
  )
}
