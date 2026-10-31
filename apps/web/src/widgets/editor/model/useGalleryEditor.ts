import { useEffect, useRef, useState } from 'react'
import { MAX_GALLERY_IMAGES } from '@blog/contracts'
import type { GalleryData, GalleryImage } from '@blog/contracts'
import { useT } from '@/shared/i18n'
import { trackEditorUpload } from '../lib/editor-uploader.ts'
import { isGalleryFile, uploadGalleryImage } from '../lib/gallery-upload.ts'

export type GalleryDraftImage = GalleryImage & { id: string }
type GalleryDraft = { items: GalleryDraftImage[]; caption: string }

export function useGalleryEditor(initial: GalleryData, onChange: (data: GalleryData) => void) {
  const { t } = useT()
  const [draft, setDraft] = useState<GalleryDraft>(() => ({
    items: initial.items.map((item) => ({ ...item, id: crypto.randomUUID() })), caption: initial.caption ?? '',
  }))
  const current = useRef(draft)
  const is_mounted = useRef(true)
  const is_uploading_ref = useRef(false)
  const [is_uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => {
    is_mounted.current = true
    return () => { is_mounted.current = false }
  }, [])

  function commit(next: GalleryDraft) {
    current.current = next
    setDraft(next)
    onChange({ items: next.items.map(({ url, width, height }) => ({ url, width, height })), caption: next.caption })
  }

  function move(id: string, destination: number) {
    const items = [...current.current.items]
    const index = items.findIndex((item) => item.id === id)
    if (index < 0 || destination < 0 || destination >= items.length) return
    const [item] = items.splice(index, 1)
    if (!item) return
    items.splice(destination, 0, item)
    commit({ ...current.current, items })
  }

  async function addFiles(files: File[]) {
    if (is_uploading_ref.current || !files.length) return
    const room = MAX_GALLERY_IMAGES - current.current.items.length
    const valid_files = files.filter(isGalleryFile)
    const messages: string[] = []
    if (valid_files.length !== files.length) messages.push(t('editor.gallery.invalid'))
    if (valid_files.length > room) messages.push(t('editor.gallery.limit', { count: MAX_GALLERY_IMAGES }))
    const batch = valid_files.slice(0, room)
    setError(messages.join(' '))
    if (!batch.length) return
    is_uploading_ref.current = true
    setUploading(true)
    try {
      await trackEditorUpload(async () => {
        // Parallel requests preserve the file-picker order, even when they finish out of order.
        const results = await Promise.allSettled(batch.map(uploadGalleryImage))
        if (!is_mounted.current) return
        const added = results.flatMap((result, offset) => {
          if (result.status === 'fulfilled') return [{ ...result.value, id: crypto.randomUUID() }]
          messages.push(t('editor.gallery.failed', { name: batch[offset]?.name ?? '' }))
          return []
        })
        commit({ ...current.current, items: [...current.current.items, ...added] })
        setError(messages.join(' '))
      })
    } finally {
      is_uploading_ref.current = false
      if (is_mounted.current) setUploading(false)
    }
  }

  return { draft, is_uploading, error, addFiles, move,
    remove: (id: string) => commit({ ...current.current, items: current.current.items.filter((item) => item.id !== id) }),
    setCaption: (caption: string) => commit({ ...current.current, caption }),
  }
}
