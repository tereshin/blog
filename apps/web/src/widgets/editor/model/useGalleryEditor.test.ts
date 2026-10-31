import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { GalleryImage } from '@blog/contracts'
import { editorUploadCount } from '../lib/editor-uploader.ts'
import { uploadGalleryImage } from '../lib/gallery-upload.ts'
import { useGalleryEditor } from './useGalleryEditor.ts'

vi.mock('../lib/gallery-upload.ts', () => ({
  isGalleryFile: (file: File) => file.type === 'image/png',
  uploadGalleryImage: vi.fn(),
}))

describe('gallery editing', () => {
  it('preserves selection order, edits during upload and successful files after a partial failure', async () => {
    let finish_first: (image: GalleryImage) => void = () => undefined
    const first = new Promise<GalleryImage>((resolve) => { finish_first = resolve })
    vi.mocked(uploadGalleryImage).mockImplementation((file) => {
      if (file.name === 'first.png') return first
      if (file.name === 'bad.png') return Promise.reject(new Error('offline'))
      return Promise.resolve({ url: 'https://media.test/last.png', width: 640, height: 400 })
    })
    const onChange = vi.fn()
    const { result } = renderHook(() => useGalleryEditor({ items: [{ url: 'https://media.test/existing.png' }], caption: '' }, onChange))
    let pending: Promise<void> | undefined
    act(() => {
      pending = result.current.addFiles(['first.png', 'bad.png', 'last.png'].map((name) => new File([''], name, { type: 'image/png' })))
    })
    expect(result.current.is_uploading).toBe(true)
    expect(editorUploadCount()).toBeGreaterThan(0)
    act(() => {
      result.current.setCaption('Изменено во время загрузки')
      result.current.remove(result.current.draft.items[0]?.id ?? '')
    })
    await act(async () => {
      finish_first({ url: 'https://media.test/first.png', width: 300, height: 400 })
      await pending
    })
    expect(result.current.draft.items.map((item) => item.url)).toEqual(['https://media.test/first.png', 'https://media.test/last.png'])
    expect(result.current.draft.caption).toBe('Изменено во время загрузки')
    expect(result.current.error).toContain('bad.png')
    expect(editorUploadCount()).toBe(0)
    act(() => result.current.move(result.current.draft.items[1]?.id ?? '', 0))
    expect(onChange).toHaveBeenLastCalledWith({ items: [
      { url: 'https://media.test/last.png', width: 640, height: 400 },
      { url: 'https://media.test/first.png', width: 300, height: 400 },
    ], caption: 'Изменено во время загрузки' })
  })
})
