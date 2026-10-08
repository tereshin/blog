import { Writable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import type { Readable } from 'node:stream'
import { fileTypeFromBuffer } from 'file-type'
import type { MediaKind } from '@blog/contracts'
import { PayloadTooLargeError } from './media.errors.ts'

export const MEDIA_LIMITS: Record<MediaKind, number> = {
  image: 8 * 1024 * 1024,
  attachment: 20 * 1024 * 1024,
}

const IMAGE_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
const DOC_MIME = 'application/msword'
const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'

/** Читает тело потоком и останавливается, как только размер превысил предел вида. */
export async function readBounded(source: Readable, limit_bytes: number): Promise<Buffer> {
  const chunks: Buffer[] = []
  let size = 0
  const sink = new Writable({
    write(chunk: Buffer, _encoding, callback) {
      const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
      size += bytes.length
      if (size > limit_bytes) callback(new PayloadTooLargeError(limit_bytes))
      else {
        chunks.push(bytes)
        callback()
      }
    },
  })
  await pipeline(source, sink)
  return Buffer.concat(chunks)
}

function looksLikeText(bytes: Buffer): boolean {
  if (bytes.length === 0 || bytes.subarray(0, 8192).includes(0)) return false
  return true
}

/** Первые байты решают тип: изображение — JPEG/PNG/WebP/GIF, вложение — PDF/DOC/DOCX/TXT. */
export async function sniff(bytes: Buffer, kind: MediaKind): Promise<string | null> {
  const found = await fileTypeFromBuffer(bytes)
  if (kind === 'image') return found && IMAGE_MIME.has(found.mime) ? found.mime : null
  if (found?.mime === 'application/pdf' || found?.mime === DOC_MIME || found?.mime === DOCX_MIME) return found.mime
  if (found?.mime === 'application/zip' && bytes.includes(Buffer.from('word/'))) return DOCX_MIME
  if (!found && looksLikeText(bytes)) return 'text/plain'
  return null
}
