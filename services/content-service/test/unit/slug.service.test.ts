import { describe, expect, it } from 'vitest'
import { RESERVED_SLUGS, SLUG_PATTERN, SlugInvalidError, SlugReservedError, SlugTakenError, createSlugService, validateSlug } from '../../src/modules/slug/index.ts'
import type { SlugOwnerType } from '../../src/modules/slug/index.ts'

type Row = { owner_type: SlugOwnerType; owner_id: string }

function memory() {
  const rows = new Map<string, Row>()
  const service = createSlugService({
    async insert(_tx, slug, owner_type, owner_id) {
      if (rows.has(slug)) return false
      rows.set(slug, { owner_type, owner_id })
      return true
    },
    async findOwner(_tx, slug) {
      return rows.get(slug) ?? null
    },
    async deleteByOwner(_tx, owner_type, owner_id, keep) {
      for (const [slug, row] of rows) if (row.owner_type === owner_type && row.owner_id === owner_id && slug !== keep) rows.delete(slug)
    },
  })
  // Транзакция тестовому хранилищу не нужна.
  const tx = undefined as never
  return { rows, service, tx }
}

describe('slug: форма адреса', () => {
  it.each(['abc', 'a1b', 'my-first-article', 'x'.repeat(40), '123'])('%s подходит', (slug) => {
    expect(SLUG_PATTERN.test(slug)).toBe(true)
  })

  it.each(['ab', 'x'.repeat(41), '-abc', 'abc-', 'ABC', 'a b c', 'абв', 'a_b', 'a.b', ''])('«%s» не подходит', (slug) => {
    expect(() => validateSlug(slug)).toThrow(SlugInvalidError)
  })

  it.each(RESERVED_SLUGS)('служебное слово %s отклоняется как служебное', (slug) => {
    expect(() => validateSlug(slug)).toThrow(SlugReservedError)
  })

  it('служебный список совпадает с контрактом', () => {
    expect([...RESERVED_SLUGS].sort()).toEqual(['p', 't', 'u', 'about', 'admin', 'api', 'auth', 'bookmarks', 'feed', 'messages', 'popular', 'rating', 'search', 'write'].sort())
  })
})

describe('slug: резервирование', () => {
  it('занимает свободный адрес', async () => {
    const { rows, service, tx } = memory()
    await service.reserveSlug(tx, 'my-slug', 'profile', 'u1')
    expect(rows.get('my-slug')).toEqual({ owner_type: 'profile', owner_id: 'u1' })
  })

  it('повтор тем же владельцем — не ошибка', async () => {
    const { service, tx } = memory()
    await service.reserveSlug(tx, 'my-slug', 'profile', 'u1')
    await expect(service.reserveSlug(tx, 'my-slug', 'profile', 'u1')).resolves.toBeUndefined()
  })

  it('чужой адрес занят — для другого владельца и для другого типа', async () => {
    const { service, tx } = memory()
    await service.reserveSlug(tx, 'my-slug', 'profile', 'u1')
    await expect(service.reserveSlug(tx, 'my-slug', 'profile', 'u2')).rejects.toBeInstanceOf(SlugTakenError)
    await expect(service.reserveSlug(tx, 'my-slug', 'topic', 'u1')).rejects.toBeInstanceOf(SlugTakenError)
  })

  it('при отказе прежний адрес владельца остаётся', async () => {
    const { rows, service, tx } = memory()
    await service.reserveSlug(tx, 'old-slug', 'profile', 'u1')
    await service.reserveSlug(tx, 'taken-slug', 'topic', 't1')
    await expect(service.replaceSlug(tx, 'taken-slug', 'profile', 'u1')).rejects.toBeInstanceOf(SlugTakenError)
    await expect(service.replaceSlug(tx, 'admin', 'profile', 'u1')).rejects.toBeInstanceOf(SlugReservedError)
    await expect(service.replaceSlug(tx, 'x', 'profile', 'u1')).rejects.toBeInstanceOf(SlugInvalidError)
    expect([...rows.keys()].sort()).toEqual(['old-slug', 'taken-slug'])
  })

  it('смена адреса освобождает прежний только после успеха', async () => {
    const { rows, service, tx } = memory()
    await service.reserveSlug(tx, 'old-slug', 'profile', 'u1')
    await service.replaceSlug(tx, 'new-slug', 'profile', 'u1')
    expect([...rows.keys()]).toEqual(['new-slug'])
    await service.reserveSlug(tx, 'old-slug', 'profile', 'u2')
  })

  it('releaseSlug освобождает все адреса владельца, чужие не трогает', async () => {
    const { rows, service, tx } = memory()
    await service.reserveSlug(tx, 'one-slug', 'article', 'a1')
    await service.reserveSlug(tx, 'two-slug', 'article', 'a2')
    await service.releaseSlug(tx, 'article', 'a1')
    expect([...rows.keys()]).toEqual(['two-slug'])
  })
})
