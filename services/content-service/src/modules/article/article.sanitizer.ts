import sanitizeHtml from 'sanitize-html'
import type { BlocksDocument, EditorBlock } from '@blog/contracts'
import { blocksDocumentSchema } from '@blog/contracts'
import type { ListItem } from '@blog/contracts'
import { ForeignFileError, InvalidBlockError } from './article.errors.ts'

const HTML = {
  allowedTags: ['b', 'i', 'u', 'code', 'mark', 'br', 'a'],
  allowedAttributes: { a: ['href'] },
  allowedSchemes: ['http', 'https', 'mailto'],
}

function clean(value: string): string {
  return sanitizeHtml(value, HTML)
}

function plain(value: string): string {
  return sanitizeHtml(value, { allowedTags: [], allowedAttributes: {} }).replaceAll(/\s+/g, ' ').trim()
}

function cleanItems(items: ListItem[]): ListItem[] {
  return items.map((item) => {
    if (typeof item === 'string') return clean(item)
    return {
      content: clean(item.content),
      ...(item.items ? { items: cleanItems(item.items) } : {}),
      ...(item.meta ? { meta: item.meta } : {}),
    }
  })
}

export type FileOwner = { uploader_id: string }

export type SanitizeOptions = {
  media_urls: readonly string[]
  author_id: string
  lookupFile: (url: string) => Promise<FileOwner | null>
}

async function assertOwnedFile(url: string, options: SanitizeOptions): Promise<void> {
  const allowed = options.media_urls.some((base) => base.length > 0 && url.startsWith(base))
  if (!allowed) throw new ForeignFileError()
  const file = await options.lookupFile(url)
  if (!file || file.uploader_id !== options.author_id) throw new ForeignFileError()
}

async function cleanBlock(block: EditorBlock, options: SanitizeOptions): Promise<EditorBlock> {
  switch (block.type) {
    case 'paragraph':
      return { ...block, data: { text: clean(block.data.text) } }
    case 'header':
      return { ...block, data: { text: clean(block.data.text), level: block.data.level } }
    case 'quote':
      return {
        ...block,
        data: {
          text: clean(block.data.text),
          ...(block.data.caption !== undefined ? { caption: clean(block.data.caption) } : {}),
        },
      }
    case 'warning':
      return { ...block, data: { title: clean(block.data.title), message: clean(block.data.message) } }
    case 'list':
      return { ...block, data: { ...block.data, items: cleanItems(block.data.items) } }
    case 'table':
      return { ...block, data: { ...block.data, content: block.data.content.map((row) => row.map(clean)) } }
    case 'code':
      return block
    case 'image':
      await assertOwnedFile(block.data.file.url, options)
      return { ...block, data: { ...block.data, ...(block.data.caption !== undefined ? { caption: clean(block.data.caption) } : {}) } }
    case 'attaches':
      await assertOwnedFile(block.data.file.url, options)
      return block
    case 'embed':
    case 'delimiter':
    case 'personality':
      return block
  }
}

/** Проверяет документ целиком и чистит встроенную разметку. Чужой файл не подменяет, а отклоняет запись. */
export async function sanitizeDocument(input: unknown, options: SanitizeOptions): Promise<BlocksDocument> {
  const parsed = blocksDocumentSchema.safeParse(input)
  if (!parsed.success) throw new InvalidBlockError()
  const blocks = []
  for (const block of parsed.data.blocks) blocks.push(await cleanBlock(block, options))
  return { ...parsed.data, blocks }
}

/** Содержательный блок — не пустой текст и не один разделитель. */
export function hasContentBlock(blocks: readonly EditorBlock[]): boolean {
  return blocks.some((block) => {
    switch (block.type) {
      case 'paragraph':
      case 'header':
        return plain(block.data.text).length > 0
      case 'quote':
        return plain(block.data.text).length > 0 || plain(block.data.caption ?? '').length > 0
      case 'warning':
        return plain(block.data.title).length > 0 || plain(block.data.message).length > 0
      case 'list':
        return block.data.items.length > 0
      case 'code':
        return block.data.code.trim().length > 0
      case 'table':
        return block.data.content.some((row) => row.some((cell) => plain(cell).length > 0))
      case 'image':
      case 'embed':
      case 'attaches':
      case 'personality':
        return true
      case 'delimiter':
        return false
    }
  })
}
