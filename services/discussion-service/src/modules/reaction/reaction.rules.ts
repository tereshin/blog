import type { ReactionKind } from '@blog/contracts'

/** Одна реакция участника на объект: нет строки — поставить, тот же вид — снять, другой вид — заменить. */
export function applyOne(current: ReactionKind | null, requested: ReactionKind): { next: ReactionKind | null; placed: boolean } {
  if (current === null) return { next: requested, placed: true }
  if (current === requested) return { next: null, placed: false }
  return { next: requested, placed: true }
}
