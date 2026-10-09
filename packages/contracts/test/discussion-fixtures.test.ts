import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { ArticleCountersUpdatedV1, ArticleViewCountedV1, CommentCreatedV1, CommentUpdatedV1, ReactionAddedV1, ReputationUpdatedV1, blocksDocumentSchema } from '../src/index.ts'

const fixtures = dirname(fileURLToPath(import.meta.url))

function read(name: string): unknown {
  return JSON.parse(readFileSync(join(fixtures, 'fixtures/discussion', name), 'utf8'))
}

describe('фикстуры событий обсуждения', () => {
  it('article_counters.updated', () => {
    expect(ArticleCountersUpdatedV1.parse(read('article-counters-updated.json')).reaction_count).toBe(3)
  })

  it('reaction.added', () => {
    expect(ReactionAddedV1.parse(read('reaction-added.json')).kind).toBe('heart')
  })

  it('reputation.updated', () => {
    expect(ReputationUpdatedV1.parse(read('reputation-updated.json')).reputation).toBe(12)
  })

  it('comment.created и comment.updated', () => {
    expect(CommentCreatedV1.parse(read('comment-created.json')).parent_id).toBeNull()
    expect(CommentUpdatedV1.parse(read('comment-updated.json')).status).toBe('visible')
  })

  it('article_view.counted', () => {
    expect(ArticleViewCountedV1.parse(read('article-view-counted.json')).view_count).toBe(2)
  })
})

describe('документ блоков', () => {
  it('принимает набор, которым пользуется seed', () => {
    const document = blocksDocumentSchema.parse({
      time: 1,
      version: '2.30.0',
      blocks: [
        { type: 'paragraph', data: { text: 'Абзац' } },
        { type: 'header', data: { text: 'Заголовок', level: 2 } },
        { type: 'list', data: { style: 'unordered', items: ['один', { content: 'два', items: ['вложенный'] }] } },
        { type: 'quote', data: { text: 'Цитата', caption: 'Автор' } },
        { type: 'delimiter', data: {} },
        { type: 'code', data: { code: 'const n = 1' } },
        { type: 'image', data: { file: { url: 'https://cdn.example/a.png' }, caption: 'Рис' } },
      ],
    })
    expect(document.blocks).toHaveLength(7)
  })

  it('неизвестный тип блока не проходит', () => {
    expect(blocksDocumentSchema.safeParse({ blocks: [{ type: 'raw', data: { html: '<script>' } }] }).success).toBe(false)
  })
})
