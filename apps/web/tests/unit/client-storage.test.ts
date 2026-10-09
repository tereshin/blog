import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'

const SRC = join(import.meta.dirname, '../../src')

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return files(path)
    return path.endsWith('.ts') || path.endsWith('.tsx') ? [path] : []
  })
}

describe('хранилища браузера', () => {
  const sources = files(SRC).filter((path) => {
    const rel = relative(SRC, path)
    return !rel.startsWith('shared/api/mocks') && !rel.endsWith('.stories.tsx')
  })

  it('localStorage только у вида оформления', () => {
    const hits = sources.filter((path) => /localStorage\./.test(readFileSync(path, 'utf8')))
    expect(hits.map((path) => relative(SRC, path))).toEqual(['entities/session/model/appearance-storage.ts'])
  })

  it('sessionStorage только у возврата ленты, полосы просмотренного и последнего визита', () => {
    const hits = sources
      .filter((path) => /sessionStorage\./.test(readFileSync(path, 'utf8')))
      .map((path) => relative(SRC, path))
      .sort()
    expect(hits).toEqual(['shared/lib/feed-return.ts', 'widgets/feed/model/useSeenArticles.ts', 'widgets/shell/model/useShellStore.ts'])
  })

  it('dangerouslySetInnerHTML только у санитайзера блоков', () => {
    const hits = sources.filter((path) => readFileSync(path, 'utf8').includes('dangerouslySetInnerHTML'))
    expect(hits).toHaveLength(1)
    const text = readFileSync(hits[0] ?? '', 'utf8')
    expect(text).toContain('DOMPurify')
    expect(text).toContain('sanitizeInline')
  })
})
