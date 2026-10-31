import type { GalleryImage } from '@blog/contracts'
import { uploadEditorFile } from './editor-uploader.ts'

export const GALLERY_ACCEPT = 'image/jpeg,image/png,image/gif,image/webp'

export function isGalleryFile(file: File): boolean {
  return GALLERY_ACCEPT.split(',').includes(file.type) || (!file.type && /\.(jpe?g|png|gif|webp)$/i.test(file.name))
}

function dimensionsOf(file: File): Promise<Pick<GalleryImage, 'width' | 'height'>> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    const image = new Image()
    const finish = (dimensions: Pick<GalleryImage, 'width' | 'height'>) => {
      URL.revokeObjectURL(url)
      resolve(dimensions)
    }
    image.onload = () => finish(image.naturalWidth > 0 && image.naturalWidth <= 30000 && image.naturalHeight > 0 && image.naturalHeight <= 30000
      ? { width: image.naturalWidth, height: image.naturalHeight } : {})
    image.onerror = () => finish({})
    image.src = url
  })
}

export async function uploadGalleryImage(file: File): Promise<GalleryImage> {
  const [uploaded, dimensions] = await Promise.all([uploadEditorFile(file, 'image'), dimensionsOf(file)])
  return { url: uploaded.file.url, ...dimensions }
}
