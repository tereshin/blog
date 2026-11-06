import sharp from 'sharp'
import { describe, expect, it } from 'vitest'
import { compressImage } from '../../src/modules/media/image-compression.ts'

const settings = { enabled: true, format: 'webp' as const, quality: 80, max_dimension: 256 }
const png = (width: number, height: number) =>
  sharp({ create: { width, height, channels: 4, background: { r: 20, g: 50, b: 80, alpha: 0.5 } } })
    .png()
    .toBuffer()

describe('uploaded image compression', () => {
  it('converts to WebP, preserves transparency and fits within the maximum side', async () => {
    const result = await compressImage(await png(1024, 512), 'image/png', settings)
    expect(result.mime).toBe('image/webp')
    expect(await sharp(result.bytes).metadata()).toMatchObject({
      format: 'webp',
      width: 256,
      height: 128,
      hasAlpha: true,
    })
  })
  it('does not upscale small images or alter bytes when disabled', async () => {
    const bytes = await png(32, 16)
    expect(
      await sharp((await compressImage(bytes, 'image/png', settings)).bytes).metadata(),
    ).toMatchObject({ width: 32, height: 16 })
    expect((await compressImage(bytes, 'image/png', { ...settings, enabled: false })).bytes).toBe(
      bytes,
    )
  })
  it('keeps PNG lossless in the original format and rejects corrupt input', async () => {
    const bytes = await png(32, 16)
    const result = await compressImage(bytes, 'image/png', { ...settings, format: 'original' })
    expect(result.mime).toBe('image/png')
    expect(await sharp(result.bytes).raw().toBuffer()).toEqual(await sharp(bytes).raw().toBuffer())
    await expect(
      compressImage(Buffer.from('invalid image'), 'image/jpeg', settings),
    ).rejects.toMatchObject({ code: 'unsupported_media_type' })
  })
  it('keeps GIF and animated WebP bytes unchanged', async () => {
    const raw = Buffer.alloc(8 * 16 * 4, 100)
    const animated = sharp(raw, { raw: { width: 8, height: 16, channels: 4, pageHeight: 8 } })
    const webp = await animated
      .clone()
      .webp({ loop: 0, delay: [100, 100] })
      .toBuffer()
    const gif = await animated
      .clone()
      .gif({ loop: 0, delay: [100, 100] })
      .toBuffer()
    expect((await compressImage(gif, 'image/gif', settings)).bytes).toBe(gif)
    expect((await compressImage(webp, 'image/webp', settings)).bytes).toBe(webp)
  })
})
