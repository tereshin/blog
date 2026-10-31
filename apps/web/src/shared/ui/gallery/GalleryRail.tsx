import type { ReactNode } from 'react'
import { useT } from '@/shared/i18n'
import { BaseIcon } from '../BaseIcon.tsx'
import { useGalleryRail } from './useGalleryRail.ts'
import './gallery.css'

export function GalleryRail({ children }: { children: ReactNode }) {
  const { t } = useT()
  const { rail_ref, edges, move, handlers } = useGalleryRail()
  return (
    <div className="gallery">
      <div ref={rail_ref} className="gallery__rail" role="region" aria-label={t('editor.gallery')} tabIndex={0} {...handlers}>
        {children}
      </div>
      <button type="button" className="gallery__arrow gallery__arrow--previous" aria-label={t('gallery.previous')}
        disabled={edges.is_start} onClick={() => move(-1)}>
        <BaseIcon name="arrow_left" size={20} />
      </button>
      <button type="button" className="gallery__arrow gallery__arrow--next" aria-label={t('gallery.next')}
        disabled={edges.is_end} onClick={() => move(1)}>
        <BaseIcon name="arrow_right" size={20} />
      </button>
    </div>
  )
}
