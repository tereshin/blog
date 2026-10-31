import { useRef } from 'react'
import type { GalleryImage } from '@blog/contracts'
import { useT } from '@/shared/i18n'
import { BaseIcon } from '../BaseIcon.tsx'
import { Dialog } from '../Dialog.tsx'

type GalleryLightboxProps = {
  items: GalleryImage[]
  selected: number | null
  onSelect: (selected: number | null) => void
}

export function GalleryLightbox({ items, selected, onSelect }: GalleryLightboxProps) {
  const { t } = useT()
  const touch_x = useRef<number | null>(null)
  const current = selected === null ? null : items[selected]
  function move(direction: number) {
    if (selected !== null) onSelect(Math.max(0, Math.min(items.length - 1, selected + direction)))
  }
  return (
    <Dialog is_open={current !== null && current !== undefined} onOpenChange={(is_open) => { if (!is_open) onSelect(null) }}
      size="full" className="gallery-lightbox" aria-label={t('editor.gallery')}>
      <div className="gallery-lightbox__content"
        onKeyDown={(event) => {
          if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
          event.preventDefault()
          event.stopPropagation()
          move(event.key === 'ArrowLeft' ? -1 : 1)
        }}
        onTouchStart={(event) => { touch_x.current = event.touches[0]?.clientX ?? null }}
        onTouchEnd={(event) => {
          const end = event.changedTouches[0]?.clientX
          if (touch_x.current !== null && end !== undefined && Math.abs(end - touch_x.current) > 50) move(end < touch_x.current ? 1 : -1)
          touch_x.current = null
        }}>
        <div className="gallery-lightbox__position" aria-live="polite">
          {t('gallery.position', { number: (selected ?? 0) + 1, count: items.length })}
        </div>
        <button type="button" autoFocus className="gallery-lightbox__close" aria-label={t('gallery.close')} onClick={() => onSelect(null)}>
          <BaseIcon name="close" size={24} />
        </button>
        {current ? <img src={current.url} alt={t('gallery.position', { number: (selected ?? 0) + 1, count: items.length })} className="gallery-lightbox__image" /> : null}
        {items.length > 1 ? <>
          <button type="button" className="gallery__arrow gallery__arrow--previous" disabled={selected === 0}
            aria-label={t('gallery.previous')} onClick={() => move(-1)}><BaseIcon name="arrow_left" size={24} /></button>
          <button type="button" className="gallery__arrow gallery__arrow--next" disabled={selected === items.length - 1}
            aria-label={t('gallery.next')} onClick={() => move(1)}><BaseIcon name="arrow_right" size={24} /></button>
        </> : null}
      </div>
    </Dialog>
  )
}
