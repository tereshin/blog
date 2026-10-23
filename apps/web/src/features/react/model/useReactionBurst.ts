import { useState } from 'react'
import type { ReactionKind } from '@/entities/reaction'

/** A burst belongs to a locally requested selection, never hydration or a rollback. */
export function useReactionBurst(my_reaction: ReactionKind | null, onSelect: (kind: ReactionKind) => void) {
  const [selection, setSelection] = useState({
    current: my_reaction,
    requested: null as ReactionKind | null,
    burst: null as ReactionKind | null,
    sequence: 0,
  })
  if (selection.current !== my_reaction) {
    setSelection({
      current: my_reaction,
      requested: null,
      burst: my_reaction !== null && selection.requested === my_reaction ? my_reaction : null,
      sequence: selection.sequence + 1,
    })
  }
  function handleSelect(kind: ReactionKind) {
    setSelection((current) => ({ ...current, requested: kind === my_reaction ? null : kind, burst: null }))
    onSelect(kind)
  }
  function handleComplete() {
    setSelection((current) => ({ ...current, burst: null }))
  }
  return { burst_kind: selection.burst, burst_key: selection.sequence, handleSelect, handleComplete }
}
