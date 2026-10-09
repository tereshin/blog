const EXCERPT_MAX = 140

/** Фрагмент последнего сообщения: пробелы схлопнуты, длинный текст обрезан по границе слова. */
export function toExcerpt(body: string, max = EXCERPT_MAX): string {
  const text = body.replace(/\s+/g, ' ').trim()
  if (text.length <= max) return text
  const cut = text.slice(0, max - 1)
  const last_space = cut.lastIndexOf(' ')
  return `${(last_space > max / 2 ? cut.slice(0, last_space) : cut).trimEnd()}…`
}
