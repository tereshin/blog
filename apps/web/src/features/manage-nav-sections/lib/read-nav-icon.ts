import { navIconSvgSchema } from '@blog/contracts'

/** Читает файл иконки. Возвращает проверенный SVG или null, если это не безопасная иконка. */
export async function readNavIconFile(file: File): Promise<string | null> {
  if (file.type.startsWith('image/') && file.type !== 'image/svg+xml') return null
  const parsed = navIconSvgSchema.safeParse(await file.text())
  if (!parsed.success) return null
  return parsed.data
}
