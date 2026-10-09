import { buildDataset } from '@blog/seed-data'
import { describe, expect, it } from 'vitest'

const options = { media_base_url: 'http://localhost:9000/media', superadmin_email: 'superadmin@blog.test' }
const anchor = new Date('2026-10-08T00:00:00Z')

describe('большой набор', () => {
  it('содержит все идентификаторы малого', () => {
    const small = buildDataset('small', anchor, options)
    const large = buildDataset('large', anchor, options)
    const ids = (rows: readonly { id: string }[]) => new Set(rows.map((row) => row.id))
    expect([...ids(small.users)].every((id) => ids(large.users).has(id))).toBe(true)
    expect([...ids(small.articles)].every((id) => ids(large.articles).has(id))).toBe(true)
    expect([...ids(small.conversations)].every((id) => ids(large.conversations).has(id))).toBe(true)
    expect(large.users.length).toBeGreaterThan(small.users.length)
  })
})
