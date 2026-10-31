import { useState } from 'react'
import type { GalleryImage } from '@blog/contracts'
import { useT } from '@/shared/i18n'
import { InlineHtml } from '../document-blocks/InlineHtml.tsx'
import { GalleryLightbox } from './GalleryLightbox.tsx'
import { GalleryRail } from './GalleryRail.tsx'

export function ImageGallery({ items, caption = '' }: { items: GalleryImage[]; caption?: string }) {
  const { t } = useT()
  const [selected, setSelected] = useState<number | null>(null)
  if (!items.length) return null
  return (
    <figure className="image-gallery my-4">
      <GalleryRail>
        {items.map((item, offset) => (
          <button type="button" className="gallery__item" key={`${item.url}-${offset}`}
            aria-label={t('gallery.open', { number: offset + 1 })} onClick={() => setSelected(offset)}>
            <img src={item.url} width={item.width} height={item.height} alt="" loading="lazy" draggable={false}
              style={item.width && item.height ? { aspectRatio: `${item.width} / ${item.height}` } : undefined} />
          </button>
        ))}
      </GalleryRail>
      {caption ? <figcaption className="mt-3 text-base text-muted"><InlineHtml html={caption} /></figcaption> : null}
      <GalleryLightbox items={items} selected={selected} onSelect={setSelected} />
    </figure>
  )
}
