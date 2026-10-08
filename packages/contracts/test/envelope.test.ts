import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { defineEvent, pageQuerySchema, pageSchema } from '../src/index.ts'

const SampleEvent = defineEvent('content.article.published', 1, { article_id: z.uuid() })

const valid = {
  event_id: '0b9f6a6e-6f0c-4f64-9d84-6d2f0f8d1c11',
  name: 'content.article.published',
  occurred_at: '2026-10-08T12:00:00.000Z',
  correlation_id: 'c-1',
  causation_id: null,
  version: 1,
  article_id: '3f1d3c9e-1b0a-4a55-8f2b-6f6d5d3f7a22',
}

describe('defineEvent', () => {
  it('принимает корректное событие', () => {
    expect(SampleEvent.parse(valid)).toEqual(valid)
  })

  it('отвергает чужое имя и версию', () => {
    expect(SampleEvent.safeParse({ ...valid, name: 'content.article.hidden' }).success).toBe(false)
    expect(SampleEvent.safeParse({ ...valid, version: 2 }).success).toBe(false)
  })
})

describe('pagination', () => {
  it('limit по умолчанию 20', () => {
    expect(pageQuerySchema.parse({}).limit).toBe(20)
  })

  it('страница содержит next_cursor', () => {
    const schema = pageSchema(z.string())
    expect(schema.parse({ items: ['a'], next_cursor: null })).toEqual({ items: ['a'], next_cursor: null })
  })
})
