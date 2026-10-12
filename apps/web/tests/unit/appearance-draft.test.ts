import { describe, expect, it } from 'vitest'
import { DEFAULT_REACTION_APPEARANCES } from '@blog/contracts'
import {
  appendDraft,
  appearancePayload,
  draftsFrom,
  moveActive,
  restoreDraft,
  retireDraft,
} from '@/features/update-settings/model/appearance-draft.ts'

const drafts = draftsFrom(DEFAULT_REACTION_APPEARANCES)

describe('черновик каталога реакций', () => {
  it('переносит активную реакцию и оставляет снятые в конце', () => {
    const retired = retireDraft(drafts, 'fire')
    const moved = moveActive(retired, 'thumb', 'laugh')
    expect(moved.map((item) => item.kind)).toEqual(['thumb', 'laugh', 'heart', 'fire'])
    expect(moved.find((item) => item.kind === 'fire')?.status).toBe('retired')
    expect(appearancePayload(moved).map((item) => item.kind)).toEqual(['thumb', 'laugh', 'heart', 'fire'])
  })

  it('не снимает последнюю активную и возвращает снятую в конец активных', () => {
    const one = retireDraft(retireDraft(retireDraft(drafts, 'laugh'), 'heart'), 'thumb')
    expect(one.filter((item) => item.status === 'active').map((item) => item.kind)).toEqual(['fire'])
    expect(retireDraft(one, 'fire')).toEqual(one)
    const restored = restoreDraft(one, 'laugh')
    expect(restored.filter((item) => item.status === 'active').map((item) => item.kind)).toEqual(['fire', 'laugh'])
  })

  it('добавляет реакцию в конец активных', () => {
    const next = appendDraft(drafts, {
      kind: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      label: 'Ракета',
      status: 'active',
      presentation: 'emoji',
      emoji: '🚀',
      image_url: '',
    })
    expect(next.at(-1)?.label).toBe('Ракета')
    expect(appearancePayload(next)).toHaveLength(5)
  })
})
