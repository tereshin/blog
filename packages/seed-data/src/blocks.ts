import type { EditorBlock, EditorDocument } from './types.ts'

export function doc(time: Date, blocks: EditorBlock[]): EditorDocument {
  return { time: time.getTime(), blocks, version: '2.30.0' }
}

export const paragraphBlock = (text: string): EditorBlock => ({ type: 'paragraph', data: { text } })
export const headerBlock = (text: string, level: 2 | 3 | 4 = 2): EditorBlock => ({ type: 'header', data: { text, level } })
export const listBlock = (items: string[], style: 'unordered' | 'ordered' | 'checklist' = 'unordered'): EditorBlock => ({
  type: 'list',
  data: { style, items },
})
export const quoteBlock = (text: string, caption: string): EditorBlock => ({ type: 'quote', data: { text, caption } })
export const codeBlock = (code: string): EditorBlock => ({ type: 'code', data: { code } })
export const delimiterBlock = (): EditorBlock => ({ type: 'delimiter', data: {} })
export const imageBlock = (url: string, caption: string): EditorBlock => ({ type: 'image', data: { file: { url }, caption } })
export const attachesBlock = (url: string, title: string, size: number, extension: string): EditorBlock => ({
  type: 'attaches',
  data: { file: { url, size, extension }, title },
})

/** Текст блока без встроенной разметки. */
export function plainText(value: string): string {
  return value.replace(/<[^>]*>/g, '').replaceAll('&nbsp;', ' ').trim()
}

function textsOf(block: EditorBlock): string[] {
  const { data } = block
  switch (block.type) {
    case 'paragraph':
    case 'header':
      return typeof data.text === 'string' ? [plainText(data.text)] : []
    case 'quote':
      return typeof data.text === 'string' ? [plainText(data.text)] : []
    case 'list':
      return Array.isArray(data.items) ? data.items.filter((item): item is string => typeof item === 'string').map(plainText) : []
    default:
      return []
  }
}

/** Весь текст документа: заголовок статьи и текстовые блоки. */
export function searchText(title: string, document: EditorDocument): string {
  return [title, ...document.blocks.flatMap(textsOf)].join(' ')
}

const EXCERPT_LENGTH = 280

/** Фрагмент для карточки: первые текстовые блоки, не длиннее `EXCERPT_LENGTH`. */
export function excerptOf(document: EditorDocument): string {
  const text = document.blocks
    .filter((block) => block.type === 'paragraph' || block.type === 'quote' || block.type === 'list')
    .flatMap(textsOf)
    .join(' ')
  return text.length <= EXCERPT_LENGTH ? text : `${text.slice(0, EXCERPT_LENGTH - 1).trimEnd()}…`
}

export function firstImageOf(document: EditorDocument): string | null {
  for (const block of document.blocks) {
    if (block.type !== 'image') continue
    const file = block.data.file
    if (typeof file === 'object' && file !== null && 'url' in file && typeof file.url === 'string') return file.url
  }
  return null
}
