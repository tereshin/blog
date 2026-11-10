import catalog from './catalog.json'

export type GoogleFont = { family: string; weights: number[]; italics: number[]; cyrillic: boolean }
export const GOOGLE_FONTS: readonly GoogleFont[] = catalog
const font_by_family = new Map(GOOGLE_FONTS.map((font) => [font.family, font]))
export function findGoogleFont(family: string): GoogleFont | undefined {
  return font_by_family.get(family)
}

/** Inter is shipped locally as the consistent default and fallback. */
export function googleFontStylesheet(family: string): string | null {
  if (family === 'Inter') return null
  const font = findGoogleFont(family)
  if (!font) return null
  const spec = font.italics.length
    ? `${family}:ital,wght@${[...font.weights.map((weight) => `0,${weight}`), ...font.italics.map((weight) => `1,${weight}`)].join(';')}`
    : `${family}:wght@${font.weights.join(';')}`
  return `https://fonts.googleapis.com/css2?${new URLSearchParams({ family: spec, display: 'swap' })}`
}
