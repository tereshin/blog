import sharp from 'sharp'
import type { ImageCompression } from '@blog/contracts'
import { UnsupportedMediaError } from './media.errors.ts'

/** libvips performs image work in its native thread pool, outside the JS event loop. */
export async function compressImage(
  bytes: Buffer,
  mime: string,
  settings: ImageCompression,
): Promise<{ bytes: Buffer; mime: string }> {
  if (!settings.enabled || mime === 'image/gif') return { bytes, mime }
  try {
    const image = sharp(bytes, { limitInputPixels: 40_000_000, failOn: 'error' }).timeout({
      seconds: 5,
    })
    const metadata = await image.metadata()
    // Keep animated WebP intact as well as GIF.
    if ((metadata.pages ?? 1) > 1) return { bytes, mime }
    image
      .rotate()
      .resize({
        width: settings.max_dimension,
        height: settings.max_dimension,
        fit: 'inside',
        withoutEnlargement: true,
      })
    let output_mime = mime
    if (settings.format === 'webp' || mime === 'image/webp') {
      image.webp({ quality: settings.quality })
      output_mime = 'image/webp'
    } else if (mime === 'image/jpeg') image.jpeg({ quality: settings.quality, mozjpeg: true })
    else image.png({ compressionLevel: 9 })
    const output = await image.toBuffer()
    const was_resized = Math.max(metadata.width ?? 0, metadata.height ?? 0) > settings.max_dimension
    if (
      !was_resized &&
      !metadata.orientation &&
      output_mime === mime &&
      output.length >= bytes.length
    )
      return { bytes, mime }
    return { bytes: output, mime: output_mime }
  } catch {
    throw new UnsupportedMediaError(mime)
  }
}
