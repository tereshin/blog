import { sumReactionCounts } from '@blog/contracts'
import type { ReactionCounts, ReactionKind } from '@blog/contracts'
import { DEFAULT_REACTION_APPEARANCES } from '@blog/contracts'

export type { ReactionCounts, ReactionKind }
export { DEFAULT_REACTION_APPEARANCES as FALLBACK_REACTION_APPEARANCES }

/** Оптимистичное изменение: повтор того же вида снимает, другой вид заменяет. */
export function applyReactionChange(
  counts: ReactionCounts,
  current: ReactionKind | null,
  requested: ReactionKind,
): { counts: ReactionCounts; my_reaction: ReactionKind | null; reaction_count: number } {
  const next: ReactionCounts = { ...counts }
  if (current) next[current] = Math.max(0, (next[current] ?? 0) - 1)
  const my_reaction = current === requested ? null : requested
  if (my_reaction) next[my_reaction] = (next[my_reaction] ?? 0) + 1
  return { counts: next, my_reaction, reaction_count: sumReactionCounts(next) }
}

export function reactionCount(counts: ReactionCounts, kind: string): number {
  return counts[kind] ?? 0
}
