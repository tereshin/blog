import { COVERAGE_RULES, buildDataset } from '@blog/seed-data'
import { describe, expect, it } from 'vitest'

describe('покрытие малого набора', () => {
  it('каждое правило находит запись', () => {
    const data = buildDataset('small', new Date('2026-10-08T00:00:00Z'), {
      media_base_url: 'http://localhost:9000/media',
      superadmin_email: 'superadmin@blog.test',
    })
    const missing = COVERAGE_RULES.filter((rule) => rule.find(data) === undefined).map((rule) => `${rule.entity}: ${rule.value}`)
    expect(missing).toEqual([])
  })
})
