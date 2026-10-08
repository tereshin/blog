import { describe, expect, it } from 'vitest'
import { applyReactionChange } from '@/entities/reaction'

const empty = { laugh: 0, heart: 0, thumb: 0, fire: 0 }

describe('applyReactionChange', () => {
  it('ставит, снимает повтор и заменяет вид', () => {
    const placed = applyReactionChange(empty, null, 'laugh')
    expect(placed).toMatchObject({ my_reaction: 'laugh', reaction_count: 1, counts: { laugh: 1 } })
    const removed = applyReactionChange(placed.counts, 'laugh', 'laugh')
    expect(removed).toMatchObject({ my_reaction: null, reaction_count: 0 })
    const replaced = applyReactionChange({ ...empty, laugh: 1 }, 'laugh', 'fire')
    expect(replaced).toMatchObject({ my_reaction: 'fire', reaction_count: 1, counts: { laugh: 0, fire: 1 } })
  })
})
