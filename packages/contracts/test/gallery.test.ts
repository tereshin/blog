import { describe, expect, it } from 'vitest'
import { blocksDocumentSchema, MAX_GALLERY_IMAGES } from '../src/http/blocks.ts'

const item = { url: 'https://media.test/a.png', width: 300, height: 400 }
const documentOf = (items: unknown[]) => ({ blocks: [{ type: 'gallery', data: { items, caption: 'Снимки' } }] })

describe('gallery document contract', () => {
  it('round-trips images, dimensions and the shared caption', () => {
    const input = documentOf([item, { url: 'https://media.test/b.png' }])
    expect(blocksDocumentSchema.parse(input)).toEqual(input)
  })
  it('rejects empty, oversized and unsafe galleries', () => {
    for (const items of [[], Array.from({ length: MAX_GALLERY_IMAGES + 1 }, () => item),
      [{ ...item, url: 'javascript:alert(1)' }], [{ ...item, url: 'https://user:pass@media.test/a.png' }],
      [{ ...item, width: 0 }], [{ ...item, height: -1 }]]) {
      expect(blocksDocumentSchema.safeParse(documentOf(items)).success).toBe(false)
    }
  })
})
