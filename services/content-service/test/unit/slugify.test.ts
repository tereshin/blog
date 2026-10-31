import { describe, expect, it } from 'vitest'
import { deriveExcerpt, deriveFirstImage, searchText, slugify, uniqueSlug } from '../../src/modules/article/lib/slugify.ts'

describe('адрес статьи', () => {
  it('использует первый снимок галереи для обложки и её подпись для поиска', () => {
    const gallery = { type: 'gallery' as const, data: { items: [{ url: 'http://media.test/gallery.png' }], caption: '<b>Поездка</b>' } }
    const image = { type: 'image' as const, data: { file: { url: 'http://media.test/image.png' } } }
    expect(deriveFirstImage([gallery, image])).toBe('http://media.test/gallery.png')
    expect(deriveFirstImage([image, gallery])).toBe('http://media.test/image.png')
    expect(searchText('Заметка', [gallery])).toBe('Заметка Поездка')
  })

  it('переводит русскую и сербскую кириллицу и обрезает до 40', () => {
    expect(slugify('Привет, мир!')).toBe('privet-mir')
    expect(slugify('Ђорђе')).toBe('djordje')
    expect(slugify('А'.repeat(50)).length).toBeLessThanOrEqual(40)
  })

  it('короткий адрес получает номер, занятый — следующий свободный', () => {
    expect(uniqueSlug('Да', 7, () => false)).toBe('post-7')
    const taken = new Set(['privet', 'privet-7'])
    expect(uniqueSlug('Привет', 7, (slug) => taken.has(slug))).toBe('privet-2')
  })

  it('фрагмент собирается из текста, первая картинка — из блока image', () => {
    const blocks = [
      { type: 'paragraph' as const, data: { text: '<b>Коротко</b> о деле' } },
      { type: 'image' as const, data: { file: { url: 'http://media.test/a.png' } } },
    ]
    expect(deriveExcerpt(blocks)).toBe('Коротко о деле')
    expect(deriveFirstImage(blocks)).toBe('http://media.test/a.png')
    expect(deriveExcerpt([])).toBe('')
  })
})
