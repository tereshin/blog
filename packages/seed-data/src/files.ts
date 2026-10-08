import { createHash } from 'node:crypto'
import { deflateSync } from 'node:zlib'
import { seedId } from './ids.ts'
import { mediaUrl } from './options.ts'
import type { SeedOptions } from './options.ts'
import { PARTICIPANT_KEYS, userId } from './participants.ts'
import type { SeedFile } from './types.ts'

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})

function crc32(bytes: Buffer): number {
  let crc = 0xffffffff
  for (const byte of bytes) crc = (CRC_TABLE[(crc ^ byte) & 0xff] ?? 0) ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

function chunk(type: string, data: Buffer): Buffer {
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([length, body, crc])
}

const SIZE = 32

/** Однотонный PNG 32×32: цвет определяется именем объекта, поэтому байты детерминированы. */
export function generatePng(object_name: string): Buffer {
  const [red = 0, green = 0, blue = 0] = createHash('sha1').update(object_name).digest()
  const row = Buffer.concat([Buffer.from([0]), Buffer.from(Array.from({ length: SIZE }, () => [red, green, blue]).flat())])
  const raw = Buffer.concat(Array.from({ length: SIZE }, () => row))
  const header = Buffer.alloc(13)
  header.writeUInt32BE(SIZE, 0)
  header.writeUInt32BE(SIZE, 4)
  header.set([8, 2, 0, 0, 0], 8)
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

/** Минимальный валидный PDF для вложения. */
export function generatePdf(): Buffer {
  return Buffer.from(
    '%PDF-1.1\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n' +
      '3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 200]>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n',
    'ascii',
  )
}

/** Байты объекта MinIO по его имени. */
export function generateFileBytes(object_name: string): Buffer {
  return object_name.endsWith('.pdf') ? generatePdf() : generatePng(object_name)
}

const SITE_IMAGES = [
  'logo', 'cover-design', 'article-1', 'article-2', 'article-3',
  'topic-design', 'topic-engineering', 'topic-product', 'topic-archive',
]

/** Список объектов MinIO с фиксированными именами: аватары участников, картинки тем и статей, вложение. */
export function buildFiles(options: SeedOptions): SeedFile[] {
  const avatars = PARTICIPANT_KEYS.map((key) => ({ name: `seed/avatar-${key.replaceAll('_', '-')}.png`, uploader: userId(key) }))
  const site = SITE_IMAGES.map((name) => ({ name: `seed/${name}.png`, uploader: userId('superadmin') }))
  const images = [...avatars, ...site].map<SeedFile>((item) => ({
    id: seedId('file', item.name),
    object_name: item.name,
    uploader_id: item.uploader,
    kind: 'image',
    mime: 'image/png',
    url: mediaUrl(options, item.name),
  }))
  return [
    ...images,
    {
      id: seedId('file', 'seed/attachment-spec.pdf'),
      object_name: 'seed/attachment-spec.pdf',
      uploader_id: userId('author_a'),
      kind: 'attachment',
      mime: 'application/pdf',
      url: mediaUrl(options, 'seed/attachment-spec.pdf'),
    },
  ]
}
