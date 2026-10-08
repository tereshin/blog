import { describe, expect, it } from 'vitest'
import { ReactionSet } from '../src/reactions.ts'
import { buildDataset } from '../src/index.ts'

const anchor = new Date('2026-10-08T00:00:00Z')

describe('seed-data: одна реакция участника на объект', () => {
  it.each(['small', 'large'] as const)('в наборе %s пара участник–объект не повторяется', (profile) => {
    const { reactions } = buildDataset(profile, anchor)
    const keys = reactions.map((r) => `${r.user_id}:${r.target_type}:${r.target_id}`)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('накопитель отвергает вторую реакцию на тот же объект, даже другого вида', () => {
    const set = new ReactionSet()
    const base = { user_id: 'u', target_type: 'article' as const, target_id: 'a', created_at: anchor }
    set.add({ ...base, kind: 'heart' })
    expect(() => set.add({ ...base, kind: 'fire' })).toThrow(/Вторая реакция/)
    set.add({ ...base, target_type: 'comment', kind: 'fire' })
    expect(set.items).toHaveLength(2)
  })

  it('все четыре вида есть и на статье, и на комментарии малого набора', () => {
    const { reactions } = buildDataset('small', anchor)
    for (const target of ['article', 'comment'] as const) {
      expect(new Set(reactions.filter((r) => r.target_type === target).map((r) => r.kind))).toEqual(new Set(['laugh', 'heart', 'thumb', 'fire']))
    }
  })
})
