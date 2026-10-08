import type { MessageKey } from '@/shared/i18n'

export const REACTION_KINDS = ['laugh', 'heart', 'thumb', 'fire'] as const
export type ReactionKind = (typeof REACTION_KINDS)[number]
export type ReactionCounts = Record<ReactionKind, number>

export const REACTION_EMOJI: Record<ReactionKind, string> = {
  laugh: '😄',
  heart: '❤️',
  thumb: '👍',
  fire: '🔥',
}

export const REACTION_LABEL: Record<ReactionKind, MessageKey> = {
  laugh: 'reaction.laugh',
  heart: 'reaction.heart',
  thumb: 'reaction.thumb',
  fire: 'reaction.fire',
}

/** Оптимистичное изменение: повтор того же вида снимает, другой вид заменяет, числа не уходят ниже нуля. */
export function applyReactionChange(
  counts: ReactionCounts,
  current: ReactionKind | null,
  requested: ReactionKind,
): { counts: ReactionCounts; my_reaction: ReactionKind | null; reaction_count: number } {
  const next: ReactionCounts = { ...counts }
  if (current) next[current] = Math.max(0, next[current] - 1)
  const my_reaction = current === requested ? null : requested
  if (my_reaction) next[my_reaction] += 1
  const reaction_count = REACTION_KINDS.reduce((sum, kind) => sum + next[kind], 0)
  return { counts: next, my_reaction, reaction_count }
}
