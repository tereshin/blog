import type { EditorBlock } from '@blog/contracts'

/** Русская таблица. Сербские буквы, которых нет в русском, идут следом и не переписывают общие. */
const LETTERS: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'yo', ж: 'zh', з: 'z', и: 'i', й: 'y',
  к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f',
  х: 'h', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'shch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
  ђ: 'dj', ј: 'j', љ: 'lj', њ: 'nj', ћ: 'c', џ: 'dz',
}

const MAX_SLUG = 40

/** Кириллица → латиница, остальное схлопывается в дефисы, длина не больше 40. */
export function slugify(title: string): string {
  const lower = title.trim().toLowerCase()
  let latin = ''
  for (const char of lower) latin += LETTERS[char] ?? char
  return latin
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, MAX_SLUG)
    .replace(/-+$/g, '')
}

function withSuffix(stem: string, suffix: string): string {
  const room = Math.max(MAX_SLUG - suffix.length, 0)
  const cut = stem.slice(0, room).replace(/-+$/g, '')
  return `${cut}${suffix}`.replace(/^-+|-+$/g, '').slice(0, MAX_SLUG)
}

/**
 * Короткий или занятый адрес получает `-{public_number}`, затем `-2`, `-3`…
 * Проверка занятости приходит снаружи: реестр адресов живёт в базе.
 */
export function uniqueSlug(title: string, public_number: number, isTaken: (slug: string) => boolean): string {
  const stem = slugify(title)
  const root = stem.length >= 3 ? stem : 'post'
  const candidates = [stem.length >= 3 ? stem : withSuffix(root, `-${public_number}`), withSuffix(root, `-${public_number}`)]
  for (let attempt = 2; attempt < 100; attempt += 1) candidates.push(withSuffix(root, `-${attempt}`))
  for (const candidate of candidates) {
    if (candidate.length >= 3 && !isTaken(candidate)) return candidate
  }
  return withSuffix(root, `-${public_number}`)
}

function textOf(block: EditorBlock): string | null {
  switch (block.type) {
    case 'paragraph':
    case 'header':
    case 'quote':
      return block.data.text
    case 'warning':
      return `${block.data.title} ${block.data.message}`
    case 'code':
      return block.data.code
    case 'list':
      return block.data.items.map((item) => (typeof item === 'string' ? item : item.content)).join(' ')
    default:
      return null
  }
}

/** Заголовок и текст блоков для `search_vector`: без обрезки фрагмента карточки. */
export function searchText(title: string, blocks: readonly EditorBlock[]): string {
  const parts = [title]
  for (const block of blocks) {
    const text = textOf(block)
    if (text) parts.push(text)
    if (block.type === 'table') parts.push(block.data.content.flat().join(' '))
    if (block.type === 'image' && block.data.caption) parts.push(block.data.caption)
    if (block.type === 'attaches') parts.push(block.data.title)
    if (block.type === 'personality') parts.push(`${block.data.name} ${block.data.description ?? ''}`)
  }
  return parts
    .join(' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Первые текстовые блоки без разметки, около 300 символов. */
export function deriveExcerpt(blocks: readonly EditorBlock[]): string {
  const plain = blocks
    .map(textOf)
    .filter((text): text is string => text !== null)
    .join(' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return plain.length > 300 ? `${plain.slice(0, 299).trimEnd()}…` : plain
}

export function deriveFirstImage(blocks: readonly EditorBlock[]): string | null {
  const image = blocks.find((block) => block.type === 'image')
  return image?.type === 'image' ? image.data.file.url : null
}
