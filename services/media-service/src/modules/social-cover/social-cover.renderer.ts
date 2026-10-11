import { readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import satori from 'satori'
import sharp from 'sharp'
import type { OverlayOptions } from 'sharp'
import { SOCIAL_COVER_SIZES } from '@blog/contracts'
import type { RenderResult, RenderTask } from './social-cover.types.ts'

let fonts: Promise<{ regular: Buffer; bold: Buffer }> | undefined
function loadFonts(): Promise<{ regular: Buffer; bold: Buffer }> {
  if (!fonts) {
    const bundled = join(import.meta.dirname, 'fonts')
    const dir = existsSync(bundled) ? bundled : join(import.meta.dirname, '../../../assets/fonts')
    fonts = Promise.all([readFile(join(dir, 'NotoSans-Regular.ttf')), readFile(join(dir, 'NotoSans-Bold.ttf'))]).then(([regular, bold]) => ({ regular, bold }))
  }
  return fonts
}

/** All layout and image work runs in the worker pool, using bundled fonts and no network. */
export async function renderSocialCover(task: RenderTask): Promise<RenderResult> {
  const { input, variant } = task
  const { width, height } = SOCIAL_COVER_SIZES[variant]
  const { settings } = input
  const warnings: string[] = []
  const layers: OverlayOptions[] = []
  if (task.background && settings.background_mode === 'image') {
    try {
      const photo = await sharp(task.background, { limitInputPixels: 40_000_000 }).rotate().resize(width, height, { fit: 'cover' }).png().toBuffer()
      layers.push({ input: photo })
      layers.push({ input: Buffer.from(`<svg width="${width}" height="${height}"><defs><linearGradient id="shade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity=".50"/><stop offset="1" stop-color="#000" stop-opacity=".85"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#shade)"/></svg>`) })
    } catch {
      warnings.push('background_decode_failed')
    }
  }
  let logo: string | undefined
  if (task.logo) {
    try {
      const logo_png = await sharp(task.logo, { limitInputPixels: 40_000_000 }).resize(140, 90, { fit: 'inside', withoutEnlargement: false }).png().toBuffer()
      logo = `data:image/png;base64,${logo_png.toString('base64')}`
    } catch {
      warnings.push('logo_decode_failed')
    }
  }
  const font_data = await loadFonts()
  const padding = Math.round(width * 0.065)
  let font_size = variant === 'vk' ? 48 : 56
  const title_height = height - padding * 2 - 108
  const chars = Array.from(input.title).length
  while (font_size > 30 && Math.ceil(chars * font_size * 0.58 / (width - padding * 2)) * font_size * 1.3 > title_height) font_size -= 2
  let brand_size = 26
  while (brand_size > 14 && Math.ceil(Array.from(input.site_name).length * brand_size * 0.62 / ((width - padding * 2) * 0.24)) * brand_size * 1.25 > 90) brand_size -= 2
  const svg = await satori({ key: null, type: 'div', props: {
    style: { width, height, position: 'relative', display: 'flex', color: settings.text_color, fontFamily: 'Noto Sans' },
    children: [
      { type: 'div', props: { style: { position: 'absolute', left: padding, top: padding, width: width - padding * 2, display: 'flex', fontSize: font_size, fontWeight: 700, lineHeight: 1.25, maxHeight: title_height, overflow: 'hidden', wordBreak: 'break-word' }, children: input.title } },
      { type: 'div', props: { style: { position: 'absolute', left: padding, bottom: padding, display: 'flex', width: width - padding * 2, justifyContent: 'space-between', alignItems: 'flex-end', gap: 24 }, children: [
        { type: 'div', props: { style: { display: 'flex', maxWidth: '72%', fontSize: variant === 'vk' ? 23 : 28, fontWeight: 700, lineHeight: 1.25, wordBreak: 'break-word' }, children: input.author_name ?? '' } },
        logo ? { type: 'img', props: { src: logo, width: 140, height: 90, style: { objectFit: 'contain' } } }
          : { type: 'div', props: { style: { display: 'flex', maxWidth: '24%', maxHeight: 90, overflow: 'hidden', fontSize: brand_size, fontWeight: 700, textAlign: 'right', wordBreak: 'break-word' }, children: input.site_name } },
      ] } },
    ],
  } }, { width, height, fonts: [{ name: 'Noto Sans', data: font_data.regular, weight: 400 }, { name: 'Noto Sans', data: font_data.bold, weight: 700 }] })
  layers.push({ input: Buffer.from(svg) })
  const bytes = await sharp({ create: { width, height, channels: 4, background: settings.background_color } }).composite(layers).flatten({ background: settings.background_color }).jpeg({ quality: 88, mozjpeg: true }).toBuffer()
  return { bytes, warnings }
}
