import { mediaUploadResponseSchema } from '@blog/contracts'
import { describe, expect, it } from 'vitest'

describe('media: контракт ответа загрузки', () => {
  it('производитель сериализует ответ той же схемой, что и контроллер', () => {
    const response = mediaUploadResponseSchema.parse({
      id: '6a1d3c9e-1b0a-4a55-8f2b-6f6d5d3f7a41',
      url: 'http://localhost:9000/media/seed/image.png',
      kind: 'image',
      mime: 'image/png',
      byte_size: 12,
    })
    expect(response.kind).toBe('image')
  })
})
