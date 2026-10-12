import sharp from 'sharp'
import { SaxesParser } from 'saxes'
import { z } from 'zod'
import { ValidationError } from '@blog/errors'
import type { FaviconVariant } from '@blog/contracts'

const SVG_TAGS = new Set([
  'svg',
  'g',
  'path',
  'rect',
  'circle',
  'ellipse',
  'line',
  'polyline',
  'polygon',
  'defs',
  'linearGradient',
  'radialGradient',
  'stop',
  'clipPath',
  'mask',
  'title',
  'desc',
  'use',
])
const SAFE_URL = /^(?:#[\w.-]+|url\(#[\w.-]+\))$/
const manifestSchema = z
  .object({
    name: z.string().optional(),
    short_name: z.string().optional(),
    description: z.string().optional(),
    start_url: z.string().optional(),
    scope: z.string().optional(),
    id: z.string().optional(),
    icons: z
      .array(
        z.object({
          src: z.string().min(1),
          sizes: z.string().optional(),
          type: z.string().optional(),
          purpose: z.string().optional(),
        }),
      )
      .optional(),
  })
  .passthrough()

function invalid(message: string): never {
  throw new ValidationError({ message })
}
export async function validateFavicon(bytes: Buffer, variant: FaviconVariant): Promise<string> {
  if (variant === 'png' || variant === 'apple') {
    const side = variant === 'png' ? 96 : 180
    try {
      const info = await sharp(bytes, { limitInputPixels: 180 * 180 }).metadata()
      if (
        info.format !== 'png' ||
        info.width !== side ||
        info.height !== side ||
        (info.pages ?? 1) !== 1
      )
        invalid(`Нужен PNG ${side}×${side}`)
      await sharp(bytes).raw().toBuffer()
    } catch (cause) {
      throw new ValidationError({ message: `Нужен корректный PNG ${side}×${side}`, cause })
    }
    return 'image/png'
  }
  if (variant === 'ico') {
    if (bytes.length < 6 || bytes.readUInt16LE(0) !== 0 || bytes.readUInt16LE(2) !== 1)
      invalid('Нужен ICO файл')
    const count = bytes.readUInt16LE(4)
    if (!count || count > 256 || bytes.length < 6 + count * 16)
      invalid('Некорректная структура ICO')
    for (let i = 0; i < count; i++) {
      const entry = 6 + i * 16
      const size = bytes.readUInt32LE(entry + 8),
        offset = bytes.readUInt32LE(entry + 12)
      if (size < 8 || offset < 6 + count * 16 || offset + size > bytes.length)
        invalid('Некорректная структура ICO')
      const image = bytes.subarray(offset, offset + size)
      const is_png = image.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
      const width = bytes[entry] || 256,
        height = bytes[entry + 1] || 256
      if (is_png) {
        try {
          const metadata = await sharp(image, { limitInputPixels: 256 * 256 }).metadata()
          if (metadata.format !== 'png' || metadata.width !== width || metadata.height !== height)
            invalid('Некорректное изображение ICO')
          await sharp(image).raw().toBuffer()
        } catch (cause) {
          throw new ValidationError({ message: 'Некорректное изображение ICO', cause })
        }
      } else {
        if (
          size < 40 ||
          image.readUInt32LE(0) !== 40 ||
          image.readInt32LE(4) !== width ||
          image.readInt32LE(8) !== height * 2 ||
          image.readUInt16LE(12) !== 1
        )
          invalid('Некорректное изображение ICO')
        const bits = image.readUInt16LE(14)
        if (![1, 4, 8, 16, 24, 32].includes(bits) || image.readUInt32LE(16) !== 0)
          invalid('Некорректное изображение ICO')
        const colors = bits <= 8 ? image.readUInt32LE(32) || 2 ** bits : 0
        const pixel_bytes = Math.ceil((width * bits) / 32) * 4 * height
        const mask_bytes = Math.ceil(width / 32) * 4 * height
        if (colors > 256 || size < 40 + colors * 4 + pixel_bytes + mask_bytes)
          invalid('Некорректное изображение ICO')
      }
    }
    return 'image/x-icon'
  }
  if (variant === 'svg') {
    let root = false
    const parser = new SaxesParser({ xmlns: true })
    parser.on('doctype', () => invalid('DTD в SVG запрещён'))
    parser.on('processinginstruction', () => invalid('Инструкции в SVG запрещены'))
    parser.on('opentag', (tag) => {
      if (!root) {
        if (tag.local !== 'svg' || tag.uri !== 'http://www.w3.org/2000/svg') invalid('Нужен SVG')
        root = true
      }
      if (tag.uri !== 'http://www.w3.org/2000/svg' || !SVG_TAGS.has(tag.local))
        invalid('Недопустимый элемент SVG')
      for (const attribute of Object.values(tag.attributes)) {
        if (
          /^on/i.test(attribute.local) ||
          attribute.local === 'style' ||
          (/(?:javascript:|data:|https?:|\/\/)/i.test(attribute.value) &&
            attribute.prefix !== 'xmlns' &&
            attribute.name !== 'xmlns')
        )
          invalid('Недопустимое содержимое SVG')
        if (attribute.local === 'href' && !SAFE_URL.test(attribute.value))
          invalid('Внешние ссылки SVG запрещены')
        if (/url\s*\(/i.test(attribute.value) && !SAFE_URL.test(attribute.value))
          invalid('Внешние ссылки SVG запрещены')
      }
    })
    parser.on('error', (cause) => {
      throw new ValidationError({ message: 'Некорректный SVG', cause })
    })
    parser.write(bytes.toString('utf8')).close()
    if (!root) invalid('Нужен SVG')
    return 'image/svg+xml'
  }
  try {
    const manifest = manifestSchema.parse(JSON.parse(bytes.toString('utf8')))
    for (const url of [
      manifest.start_url,
      manifest.scope,
      manifest.id,
      ...(manifest.icons ?? []).map((icon) => icon.src),
    ]) {
      if (
        url !== undefined &&
        (!['http:', 'https:'].includes(new URL(url, 'https://site.invalid/').protocol) ||
          url.includes('\\'))
      )
        invalid('Недопустимый адрес в manifest')
    }
  } catch (cause) {
    throw new ValidationError({ message: 'Нужен корректный JSON manifest', cause })
  }
  return 'application/manifest+json'
}
