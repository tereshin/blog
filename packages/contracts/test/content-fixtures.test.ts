import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { ArticleDeletedV1, ArticlePublishedV1, ArticleUpdatedV1 } from '../src/index.ts'

const root = dirname(fileURLToPath(import.meta.url))

function read(name: string): unknown {
  return JSON.parse(readFileSync(join(root, 'fixtures', name), 'utf8'))
}

describe('фикстуры событий статьи', () => {
  it('published, updated и deleted разбираются одной формой снимка', () => {
    expect(ArticlePublishedV1.parse(read('content/article-published.json')).status).toBe('published')
    expect(ArticleUpdatedV1.parse(read('content/article-updated.json')).slug).toBe('zagolovok')
    expect(ArticleDeletedV1.parse(read('content/article-deleted.json')).status).toBe('deleted')
  })
})
