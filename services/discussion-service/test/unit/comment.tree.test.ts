import { describe, expect, it } from 'vitest'
import { canReadArticle } from '@blog/contracts'
import type { PageQuery, ServiceContext } from '@blog/contracts'
import { createCommentService } from '../../src/modules/comment/index.ts'
import type { CommentWriter } from '../../src/modules/comment/comment.write.ts'
import { assembleCommentTree } from '../../src/modules/comment/comment.tree.ts'
import type { CommentRow } from '../../src/modules/comment/comment.tree.ts'
import type { CommentRepository } from '../../src/modules/comment/comment.types.ts'

const AUTHOR = '3f1d3c9e-1b0a-4a55-8f2b-6f6d5d3f7a22'
const ROOT = '7a1c2d30-1111-4a11-8a11-000000000010'
const REPLY = '7a1c2d30-1111-4a11-8a11-000000000011'
const GONE = '7a1c2d30-1111-4a11-8a11-000000000012'

function row(patch: Partial<CommentRow> & Pick<CommentRow, 'id' | 'status'>): CommentRow {
  return {
    author_id: AUTHOR,
    parent_id: null,
    body: 'Текст',
    edited_at: null,
    reaction_count: 0,
    reply_count: 0,
    created_at: new Date('2026-10-08T10:00:00.000Z'),
    author_name: 'Анна',
    author_avatar_url: null,
    ...patch,
  }
}

describe('дерево комментариев', () => {
  it('прячет удалённый без ответов и оставляет заглушку, если ответы есть', () => {
    const tree = assembleCommentTree(
      [
        row({ id: GONE, status: 'deleted', body: 'секрет', created_at: new Date('2026-10-08T09:00:00.000Z') }),
        row({ id: ROOT, status: 'hidden', body: 'скрыто', reply_count: 1 }),
      ],
      [row({ id: REPLY, parent_id: ROOT, status: 'visible', body: 'ответ' })],
      new Map(),
      new Map(),
    )
    expect(tree.map((item) => item.id)).toEqual([ROOT])
    expect(tree[0]?.body).toBeNull()
    expect(tree[0]?.status).toBe('hidden')
    expect(tree[0]?.replies[0]?.body).toBe('ответ')
  })
})

describe('listForArticle', () => {
  const guest: ServiceContext = { role: 'guest', is_restricted: false, can_publish: false, viewer_key: 'guest:1' }
  const query: PageQuery = { limit: 20 }
  const repository: CommentRepository = {
    findPopular: async () => [],
    findArticle: async () => ({ author_id: AUTHOR, visibility: 'members', status: 'published', comments_enabled: true }),
    listRoots: async () => [],
    listReplies: async () => [],
    countReactions: async () => [],
    findMine: async () => [],
    listByAuthor: async () => [],
  }

  it('гость не читает обсуждение статьи только для участников', async () => {
    const writer: CommentWriter = {
      insert: async () => { throw new Error('unused') },
      update: async () => { throw new Error('unused') },
      remove: async () => { throw new Error('unused') },
      moderate: async () => { throw new Error('unused') },
    }
    const service = createCommentService(repository, writer)
    await expect(service.listForArticle(guest, '7a1c2d30-1111-4a11-8a11-000000000099', query)).rejects.toMatchObject({ http_status: 404 })
    expect(canReadArticle(guest, { author_id: AUTHOR, visibility: 'members', status: 'published' })).toBe(false)
  })
})
