import { describe, expect, it } from 'vitest'
import { assertUploadedMediaUrl } from '../../src/shared/media-url.ts'

describe('uploaded media URLs after changing storage', () => {
  it('accepts a registered R2 file while retaining original storage and site image origins', async () => {
    const bases = ['https://old.example.com', 'https://blog.example.com']
    await expect(
      assertUploadedMediaUrl('https://old.example.com/logo.png', bases, 'logo'),
    ).resolves.toBeUndefined()
    await expect(
      assertUploadedMediaUrl('https://media.example.com/uploads/logo', bases, 'logo', async () => ({
        uploader_id: 'admin',
        public_url: 'https://media.example.com',
      })),
    ).resolves.toBeUndefined()
  })
  it('rejects unregistered external files, mismatched storage and URL credentials', async () => {
    for (const url of [
      'https://foreign.example.com/image',
      'file:///etc/passwd',
      'https://name:secret@old.example.com/image',
    ])
      await expect(
        assertUploadedMediaUrl(url, 'https://old.example.com', 'logo', async () => null),
      ).rejects.toMatchObject({ code: 'validation_failed' })
    await expect(
      assertUploadedMediaUrl(
        'https://other.example.com/image',
        'https://old.example.com',
        'logo',
        async () => ({ uploader_id: 'admin', public_url: 'https://media.example.com' }),
      ),
    ).rejects.toMatchObject({ code: 'validation_failed' })
  })
})
