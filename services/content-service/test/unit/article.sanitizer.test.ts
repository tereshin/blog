import { describe, expect, it } from 'vitest'
import { ForeignFileError, InvalidBlockError } from '../../src/modules/article/article.errors.ts'
import { hasContentBlock, sanitizeDocument } from '../../src/modules/article/article.sanitizer.ts'

const AUTHOR = '3f1d3c9e-1b0a-4a55-8f2b-6f6d5d3f7a22'
const MEDIA = 'http://media.test'
const OWN = `${MEDIA}/a.png`

const options = {
  media_urls: [MEDIA],
  author_id: AUTHOR,
  lookupFile: async (url: string) => (url === OWN ? { uploader_id: AUTHOR } : { uploader_id: '9a1d3c9e-1b0a-4a55-8f2b-6f6d5d3f7a99' }),
}

describe('санитайзер статьи', () => {
  it('неизвестный блок отклоняет весь документ', async () => {
    await expect(sanitizeDocument({ blocks: [{ type: 'raw', data: { html: '<script>' } }] }, options)).rejects.toBeInstanceOf(InvalidBlockError)
  })

  it('оставляет разрешённую разметку и вырезает скрипт и чужую схему', async () => {
    const document = await sanitizeDocument(
      {
        blocks: [
          { type: 'paragraph', data: { text: '<b>жирный</b><script>x</script><a href="javascript:alert(1)">нет</a><a href="https://blog.test">да</a>' } },
        ],
      },
      options,
    )
    const block = document.blocks[0]
    expect(block?.type).toBe('paragraph')
    if (block?.type !== 'paragraph') return
    expect(block.data.text).toContain('<b>жирный</b>')
    expect(block.data.text).not.toContain('script')
    expect(block.data.text).not.toContain('javascript:')
    expect(block.data.text).toContain('https://blog.test')
  })

  it('код остаётся текстом, чужой файл отклоняется', async () => {
    const document = await sanitizeDocument({ blocks: [{ type: 'code', data: { code: '<b>не тег</b>' } }] }, options)
    expect(document.blocks[0]).toMatchObject({ type: 'code', data: { code: '<b>не тег</b>' } })
    await expect(
      sanitizeDocument({ blocks: [{ type: 'image', data: { file: { url: 'https://evil.test/a.png' } } }] }, options),
    ).rejects.toBeInstanceOf(ForeignFileError)
    await expect(sanitizeDocument({ blocks: [{ type: 'image', data: { file: { url: `${MEDIA}/other.png` } } }] }, options)).rejects.toBeInstanceOf(ForeignFileError)
  })

  it('чистит имя и должность и отклоняет чужое фото', async () => {
    const document = await sanitizeDocument(
      {
        blocks: [
          {
            type: 'personality',
            data: { name: '<b>Анна</b><script>x</script>', position: '<i>Редактор</i>', photo: OWN },
          },
        ],
      },
      options,
    )
    expect(document.blocks[0]).toMatchObject({
      type: 'personality',
      data: { name: 'Анна', position: 'Редактор', photo: OWN },
    })
    await expect(
      sanitizeDocument(
        { blocks: [{ type: 'personality', data: { name: 'Анна', photo: 'https://evil.test/a.png' } }] },
        options,
      ),
    ).rejects.toBeInstanceOf(ForeignFileError)
    expect(hasContentBlock([{ type: 'personality', data: { name: '  ' } }])).toBe(false)
    expect(hasContentBlock([{ type: 'personality', data: { name: 'Анна' } }])).toBe(true)
  })

  it('кнопки: текст без разметки, ссылка только http(s), иконка только из белого списка svg', async () => {
    const icon = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M4 12h16"/></svg>'
    const button = { text: '<b>A &amp; B</b><script>x</script>', url: 'https://shop.test', size: 'lg', variant: 'danger-soft', icon }
    const document = await sanitizeDocument({ blocks: [{ type: 'buttons', data: { items: [button] } }] }, options)
    expect(document.blocks[0]).toEqual({
      type: 'buttons',
      data: { items: [{ text: 'A & B', url: 'https://shop.test/', size: 'lg', variant: 'danger-soft', icon }] },
    })
    const rejected = [
      { ...button, url: 'javascript:alert(1)' },
      { ...button, text: '<b></b>' },
      { ...button, variant: 'link' },
      { ...button, icon: '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>' },
      { ...button, icon: '<svg xmlns="http://www.w3.org/2000/svg"><image href="https://evil.test/a.png"/></svg>' },
    ]
    for (const item of rejected) {
      await expect(sanitizeDocument({ blocks: [{ type: 'buttons', data: { items: [item] } }] }, options)).rejects.toBeInstanceOf(InvalidBlockError)
    }
    await expect(sanitizeDocument({ blocks: [{ type: 'buttons', data: { items: [] } }] }, options)).rejects.toBeInstanceOf(InvalidBlockError)
  })

  it('один разделитель не считается содержанием, абзац и список считаются', () => {
    expect(hasContentBlock([{ type: 'delimiter', data: {} }])).toBe(false)
    expect(hasContentBlock([{ type: 'paragraph', data: { text: '  ' } }])).toBe(false)
    expect(hasContentBlock([{ type: 'paragraph', data: { text: 'Есть текст' } }])).toBe(true)
    expect(hasContentBlock([{ type: 'list', data: { style: 'unordered', items: ['один'] } }])).toBe(true)
  })
})
