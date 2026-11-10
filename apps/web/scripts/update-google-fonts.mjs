import { writeFile } from 'node:fs/promises'

// Refresh a small, offline catalog from the same Google-owned metadata used by fonts.google.com.
const source = 'https://fonts.google.com/metadata/fonts'
const response = await fetch(source)
if (!response.ok) throw new Error(`Google Fonts metadata returned ${response.status}`)
const text = await response.text()
const data = JSON.parse(text.slice(text.indexOf('{')))
const ui_weights = [400, 500, 600, 700]
const families = data.familyMetadataList
  .flatMap((font) => {
    const normal = Object.keys(font.fonts)
      .filter((key) => /^\d+$/.test(key))
      .map(Number)
      .sort((a, b) => a - b)
    if (!normal.length) return []
    const italic = Object.keys(font.fonts)
      .filter((key) => /^\d+i$/.test(key))
      .map((key) => Number(key.slice(0, -1)))
    const weights = normal.filter((weight) => ui_weights.includes(weight))
    return [
      {
        family: font.family,
        weights: weights.length ? weights : [normal[0]],
        italics: italic.filter((weight) => ui_weights.includes(weight)).sort((a, b) => a - b),
        cyrillic: font.subsets.includes('cyrillic'),
      },
    ]
  })
  .sort((a, b) => a.family.localeCompare(b.family, 'en'))
await writeFile(
  new URL('../../../packages/contracts/src/fonts/catalog.json', import.meta.url),
  JSON.stringify(families) + '\n',
)
process.stdout.write(`Updated ${families.length} Google Fonts families from ${source}\n`)
