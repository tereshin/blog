import { buildDataset } from '@blog/seed-data'
import { describe, expect, it } from 'vitest'

const options = { media_base_url: 'http://localhost:9000/media', superadmin_email: 'superadmin@blog.test' }
const anchor = new Date('2026-10-08T00:00:00Z')

describe('детерминизм seed', () => {
  it('два построения малого набора совпадают', () => {
    const left = buildDataset('small', anchor, options)
    const right = buildDataset('small', anchor, options)
    expect(left.users.map((user) => user.id)).toEqual(right.users.map((user) => user.id))
    expect(left.articles.map((article) => article.id)).toEqual(right.articles.map((article) => article.id))
    expect(left.messages.map((message) => message.id)).toEqual(right.messages.map((message) => message.id))
    expect(left.files.map((file) => file.url)).toEqual(right.files.map((file) => file.url))
  })
})
