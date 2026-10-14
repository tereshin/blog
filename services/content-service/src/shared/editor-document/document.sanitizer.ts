import { decodeHTML } from 'entities'
import sanitizeHtml from 'sanitize-html'
import type { BlocksDocument, EditorBlock } from '@blog/contracts'
import { blocksDocumentSchema } from '@blog/contracts'
import type { ListItem } from '@blog/contracts'
import { ForeignFileError, InvalidBlockError } from './document.errors.ts'

const HTML = {
  allowedTags: ['b', 'i', 'u', 'code', 'mark', 'br', 'a'],
  allowedAttributes: { a: ['href'] },
  allowedSchemes: ['http', 'https', 'mailto'],
}

function clean(value: string): string {
  return sanitizeHtml(value, HTML)
}

function plain(value: string): string {
  return sanitizeHtml(value, { allowedTags: [], allowedAttributes: {} })
    .replaceAll(/\s+/g, ' ')
    .trim()
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
  existing_urls?: ReadonlySet<string>
  lookupFile: (url: string) => Promise<FileOwner | null>
}

function isMediaUrl(value: string, base: string): boolean {
  try {
    const url = new URL(value)
    const allowed = new URL(base)
    const prefix = allowed.pathname.replace(/\/$/, '')
    return (
      ['http:', 'https:'].includes(url.protocol) &&
      !url.username &&
      !url.password &&
      url.origin === allowed.origin &&
      (url.pathname === prefix || url.pathname.startsWith(`${prefix}/`))
    )
  } catch {
    return false
  }
}

async function assertOwnedFile(url: string, options: SanitizeOptions): Promise<void> {
  const allowed = options.media_urls.some((base) => isMediaUrl(url, base))
  if (!allowed) throw new ForeignFileError()
  const file = await options.lookupFile(url)
  if (!file || (file.uploader_id !== options.author_id && !options.existing_urls?.has(url)))
    throw new ForeignFileError()
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
      return {
        ...block,
        data: { title: clean(block.data.title), message: clean(block.data.message) },
      }
    case 'list':
      return { ...block, data: { ...block.data, items: cleanItems(block.data.items) } }
    case 'table':
      return {
        ...block,
        data: { ...block.data, content: block.data.content.map((row) => row.map(clean)) },
      }
    case 'code':
      return block
    case 'image':
      await assertOwnedFile(block.data.file.url, options)
      return {
        ...block,
        data: {
          ...block.data,
          ...(block.data.caption !== undefined ? { caption: clean(block.data.caption) } : {}),
        },
      }
    case 'attaches': {
      await assertOwnedFile(block.data.file.url, options)
      const safeExtension = (value: string | undefined): string | undefined => {
        const extension = value?.toLowerCase()
        return extension && /^[a-z0-9]{1,8}$/.test(extension) ? extension : undefined
      }
      const { extension: file_extension, ...file } = block.data.file
      const { extension: block_extension, ...data } = block.data
      const safe_file = safeExtension(file_extension)
      const safe_block = safeExtension(block_extension)
      return {
        ...block,
        data: {
          ...data,
          file: { ...file, ...(safe_file ? { extension: safe_file } : {}) },
          title: decodeHTML(plain(block.data.title)),
          ...(safe_block ? { extension: safe_block } : {}),
        },
      }
    }
    case 'embed':
    case 'delimiter':
      return block
    case 'personality': {
      const photo = block.data.photo?.trim() ?? ''
      if (photo) await assertOwnedFile(photo, options)
      const position = block.data.position
      return {
        ...block,
        data: {
          name: plain(block.data.name),
          ...(position !== undefined ? { position: plain(position) } : {}),
          ...(photo ? { photo } : {}),
        },
      }
    }
    case 'buttons': {
      const items = block.data.items.map((item) => {
        const text = decodeHTML(plain(item.text))
        if (!text) throw new InvalidBlockError()
        return { ...item, text, url: new URL(item.url).toString() }
      })
      return { ...block, data: { items } }
    }
  }
}

/** Проверяет документ целиком и чистит встроенную разметку. Чужой файл не подменяет, а отклоняет запись. */
export async function sanitizeDocument(
  input: unknown,
  options: SanitizeOptions,
): Promise<BlocksDocument> {
  const parsed = blocksDocumentSchema.safeParse(input)
  if (!parsed.success) throw new InvalidBlockError()
  const blocks = []
  for (const block of parsed.data.blocks) blocks.push(await cleanBlock(block, options))
  return { ...parsed.data, blocks }
}

function hasListContent(items: readonly ListItem[]): boolean {
  return items.some((item) =>
    typeof item === 'string'
      ? plain(item).length > 0
      : plain(item.content).length > 0 || hasListContent(item.items ?? []),
  )
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
        return hasListContent(block.data.items)
      case 'code':
        return block.data.code.trim().length > 0
      case 'table':
        return block.data.content.some((row) => row.some((cell) => plain(cell).length > 0))
      case 'image':
      case 'embed':
      case 'attaches':
      case 'buttons':
        return true
      case 'personality':
        return (
          plain(block.data.name).length > 0 ||
          plain(block.data.position ?? '').length > 0 ||
          Boolean(block.data.photo?.trim())
        )
      case 'delimiter':
        return false
    }
  })
}
