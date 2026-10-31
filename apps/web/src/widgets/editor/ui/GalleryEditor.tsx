import { useRef, useState } from 'react'
import { MAX_GALLERY_IMAGES } from '@blog/contracts'
import type { GalleryData } from '@blog/contracts'
import { useT } from '@/shared/i18n'
import { BaseIcon, GalleryLightbox, GalleryRail } from '@/shared/ui'
import { GALLERY_ACCEPT } from '../lib/gallery-upload.ts'
import { useGalleryEditor } from '../model/useGalleryEditor.ts'
import '../styles/gallery-editor.css'

export function GalleryEditor({ initial, onChange }: { initial: GalleryData; onChange: (data: GalleryData) => void }) {
  const { t } = useT()
  const input_ref = useRef<HTMLInputElement>(null)
  const [selected, setSelected] = useState<number | null>(null)
  const { draft, is_uploading, error, addFiles, move, remove, setCaption } = useGalleryEditor(initial, onChange)
  return (
    <div className="gallery-editor" contentEditable={false} onKeyDown={(event) => event.stopPropagation()}
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault()
        event.stopPropagation()
        if (event.dataTransfer.files.length) void addFiles(Array.from(event.dataTransfer.files))
      }}>
      <GalleryRail>
        {draft.items.map((item, offset) => (
          <div className="gallery__item gallery-editor__item" key={item.id}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              const id = event.dataTransfer.getData('application/x-gallery-image')
              if (!id) return
              event.preventDefault()
              event.stopPropagation()
              move(id, offset)
            }}>
            <button type="button" className="gallery-editor__preview" onClick={() => setSelected(offset)}
              aria-label={t('gallery.open', { number: offset + 1 })}>
              <img src={item.url} width={item.width} height={item.height} alt="" draggable={false}
                style={item.width && item.height ? { aspectRatio: `${item.width} / ${item.height}` } : undefined} />
            </button>
            <div className="gallery-editor__actions" data-gallery-action="true">
              <span className="gallery-editor__drag" draggable aria-hidden="true"
                onDragStart={(event) => { event.dataTransfer.setData('application/x-gallery-image', item.id); event.dataTransfer.effectAllowed = 'move' }}>⋮⋮</span>
              <button type="button" aria-label={t('editor.gallery.left')} disabled={offset === 0}
                onClick={() => move(item.id, offset - 1)}><BaseIcon name="arrow_left" size={16} /></button>
              <button type="button" aria-label={t('editor.gallery.right')} disabled={offset === draft.items.length - 1}
                onClick={() => move(item.id, offset + 1)}><BaseIcon name="arrow_right" size={16} /></button>
              <button type="button" aria-label={t('editor.gallery.remove')} onClick={() => remove(item.id)}><BaseIcon name="close" size={16} /></button>
            </div>
          </div>
        ))}
        <button type="button" className="gallery-editor__add" data-gallery-action="true"
          disabled={is_uploading || draft.items.length >= MAX_GALLERY_IMAGES} onClick={() => input_ref.current?.click()}>
          <span aria-hidden="true">+</span>
          {t(is_uploading ? 'editor.gallery.uploading' : 'editor.gallery.add')}
        </button>
      </GalleryRail>
      <input ref={input_ref} type="file" multiple accept={GALLERY_ACCEPT} hidden aria-label={t('editor.gallery.add')}
        onChange={(event) => { void addFiles(Array.from(event.target.files ?? [])); event.target.value = '' }} />
      <input className="gallery-editor__caption" type="text" maxLength={2000} value={draft.caption}
        placeholder={t('editor.gallery.caption')} aria-label={t('editor.gallery.caption')} onChange={(event) => setCaption(event.target.value)} />
      {is_uploading ? <p role="status" className="gallery-editor__status">{t('editor.gallery.uploading')}</p> : null}
      {error ? <p role="alert" className="gallery-editor__error">{error}</p> : null}
      <GalleryLightbox items={draft.items} selected={selected} onSelect={setSelected} />
    </div>
  )
}
