import { describe, expect, it } from 'vitest'
import { sniff } from '../../src/modules/media/media.sniff.ts'

const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
)
const GIF = Buffer.from('R0lGODlhAQABAIAAAP///wAAACwAAAAAAQABAAACAkQBADs=', 'base64')
const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01])

/** Минимальный ZIP из несжатых записей: для распознавания Office достаточно локальных заголовков. */
function zip(entries: Record<string, string>): Buffer {
  const parts = Object.entries(entries).map(([name, content]) => {
    const body = Buffer.from(content)
    const file_name = Buffer.from(name)
    const header = Buffer.alloc(30)
    header.writeUInt32LE(0x04034b50, 0)
    header.writeUInt16LE(20, 4)
    header.writeUInt32LE(body.length, 18)
    header.writeUInt32LE(body.length, 22)
    header.writeUInt16LE(file_name.length, 26)
    return Buffer.concat([header, file_name, body])
  })
  return Buffer.concat(parts)
}

function office(main: string, directory: string): Buffer {
  return zip({
    '[Content_Types].xml': `<?xml version="1.0"?><Types><Override PartName="/${directory}/main.xml" ContentType="${main}.main+xml"/></Types>`,
    [`${directory}/main.xml`]: '<x/>',
  })
}

describe('sniff: вложения', () => {
  it.each([
    ['pdf', Buffer.from('%PDF-1.7\n%âãÏÓ\n1 0 obj\n'), 'application/pdf'],
    ['rtf', Buffer.from('{\\rtf1\\ansi Привет}'), 'application/rtf'],
    ['jpg', JPEG, 'image/jpeg'],
    ['png', PNG, 'image/png'],
    ['gif', GIF, 'image/gif'],
    ['txt', Buffer.from('Обычный текст\n'), 'text/plain'],
    ['csv', Buffer.from('name;count\nАнна;3\n'), 'text/plain'],
    ['md', Buffer.from('# Заголовок\n\n- пункт\n'), 'text/plain'],
    [
      'docx',
      office('application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'word'),
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ],
    [
      'xlsx',
      office('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'xl'),
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ],
  ])('принимает %s', async (_ext, bytes, mime) => {
    expect(await sniff(bytes, 'attachment')).toBe(mime)
  })

  it('отклоняет двоичные файлы других типов', async () => {
    expect(await sniff(Buffer.from([0x7f, 0x45, 0x4c, 0x46, 0x02, 0x01, 0x01, 0x00]), 'attachment')).toBeNull()
    expect(await sniff(zip({ 'payload.bin': 'x' }), 'attachment')).toBeNull()
    expect(await sniff(Buffer.from([0x00, 0x01, 0x02]), 'attachment')).toBeNull()
  })

  it('изображение не принимает документ', async () => {
    expect(await sniff(Buffer.from('%PDF-1.7\n'), 'image')).toBeNull()
    expect(await sniff(PNG, 'image')).toBe('image/png')
  })
})
