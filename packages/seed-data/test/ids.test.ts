import { describe, expect, it } from 'vitest'
import { seedId, uuidV5 } from '../src/index.ts'

describe('uuidV5', () => {
  it('совпадает с эталоном RFC 4122 (DNS-пространство, python.org)', () => {
    expect(uuidV5('python.org', '6ba7b810-9dad-11d1-80b4-00c04fd430c8')).toBe('886313e1-3b8a-5372-9b90-0c9aee199e5d')
  })
})

describe('seedId', () => {
  it('одинаковый вход — одинаковый id при каждом запуске', () => {
    expect(seedId('user', 'superadmin')).toBe(seedId('user', 'superadmin'))
    // Зафиксированные значения: смена пространства имён или формата ключа сломает ссылки между базами.
    expect(seedId('user', 'superadmin')).toBe('475f5622-d6ec-5853-baac-3a7b7f5c9936')
    expect(seedId('article', 'small:017')).toBe('4e273eb8-c0ba-560b-bb62-97f652809c5a')
  })

  it('разные сущности и ключи дают разные id', () => {
    const ids = new Set([
      seedId('user', 'superadmin'),
      seedId('user', 'admin'),
      seedId('article', 'small:017'),
      seedId('comment', 'large:03412'),
    ])
    expect(ids.size).toBe(4)
  })

  it('результат — UUID версии 5', () => {
    expect(seedId('article', 'small:017')).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
  })
})
