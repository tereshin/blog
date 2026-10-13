import { describe, expect, it } from 'vitest'
import { createPageSchema, updatePageSchema } from '../src/http/pages.ts'

describe('page contracts', () => {
  it('requires a title and a valid slug but permits empty drafts', () => {
    expect(createPageSchema.parse({ title: ' Contacts ', slug: 'contacts' })).toMatchObject({
      title: 'Contacts',
      blocks: { blocks: [] },
    })
    for (const slug of ['ab', '-abc', 'Abc', 'abc-', 'a'.repeat(41)]) {
      expect(createPageSchema.safeParse({ title: 'Contacts', slug }).success).toBe(false)
    }
    expect(createPageSchema.safeParse({ title: ' ', slug: 'contacts' }).success).toBe(false)
    expect(
      createPageSchema.safeParse({ title: 'X', slug: 'contacts', status: 'published' }).success,
    ).toBe(false)
  })
  it('bounds documents before recursive parsing and rejects unsupported blocks', () => {
    const body = { title: 'X', slug: 'contacts' }
    expect(
      createPageSchema.safeParse({
        ...body,
        blocks: { blocks: Array.from({ length: 501 }, () => ({ type: 'delimiter' })) },
      }).success,
    ).toBe(false)
    let items: unknown[] = ['bottom']
    for (let depth = 0; depth < 30; depth++) items = [{ content: 'nested', items }]
    expect(
      createPageSchema.safeParse({
        ...body,
        blocks: { blocks: [{ type: 'list', data: { style: 'ordered', items } }] },
      }).success,
    ).toBe(false)
    expect(
      createPageSchema.safeParse({ ...body, blocks: { blocks: [{ type: 'script' }] } }).success,
    ).toBe(false)
  })
  it('requires CAS and a change and forbids deleted via PATCH', () => {
    expect(updatePageSchema.safeParse({ expected_version: 1 }).success).toBe(false)
    expect(updatePageSchema.safeParse({ status: 'published' }).success).toBe(false)
    expect(updatePageSchema.safeParse({ expected_version: 1, status: 'deleted' }).success).toBe(
      false,
    )
    expect(updatePageSchema.safeParse({ expected_version: 1, status: 'published' }).success).toBe(
      true,
    )
  })
})
