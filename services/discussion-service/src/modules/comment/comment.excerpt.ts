import { COMMENT_EXCERPT_LENGTH } from './comment.schema.ts'

/** Фрагмент для правой карточки и события: пробелы схлопнуты, длинный текст обрезан по границе слова с «…». */
export function toExcerpt(body: string, max = COMMENT_EXCERPT_LENGTH): string {
  const text = body.replace(/\s+/g, ' ').trim()
  if (text.length <= max) return text
  const cut = text.slice(0, max - 1)
  const last_space = cut.lastIndexOf(' ')
  return `${(last_space > max / 2 ? cut.slice(0, last_space) : cut).trimEnd()}…`
}
