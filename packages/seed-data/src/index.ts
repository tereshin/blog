import { derive } from './derive.ts'
import { DEFAULT_SEED_OPTIONS } from './options.ts'
import type { SeedOptions } from './options.ts'
import { buildLarge } from './profiles/large.ts'
import { buildSmall } from './profiles/small.ts'
import type { Dataset, SeedProfileName } from './types.ts'

export {
  ANCHOR_OFFSETS,
  AnchorConflictError,
  DAY_MS,
  at,
  resolveAnchor,
  startOfUtcDay,
} from './anchor.ts'
export type { ResolveAnchorInput } from './anchor.ts'
export { SEED_NAMESPACE, seedId, uuidV5 } from './ids.ts'
export { int, mulberry32, pick, shuffle } from './prng.ts'
export type { Prng } from './prng.ts'
export { DEFAULT_SEED_OPTIONS, mediaUrl } from './options.ts'
export type { SeedOptions } from './options.ts'
export { PARTICIPANT_DEFS, PARTICIPANT_KEYS, buildParticipants, userId } from './participants.ts'
export { generateFileBytes } from './files.ts'
export { COVERAGE_RULES } from './coverage.ts'
export type { CoverageRule } from './coverage.ts'
export { GUEST_VIEWER_KEY, userViewerKey } from './views.ts'
export { derive } from './derive.ts'
export * from './types.ts'

/** Полный набор для профиля. Один и тот же вход всегда даёт один и тот же результат. */
export function buildDataset(profile: SeedProfileName, anchor: Date, options: SeedOptions = DEFAULT_SEED_OPTIONS): Dataset {
  const body = profile === 'large' ? buildLarge(anchor, options) : buildSmall(anchor, options)
  return { profile, anchor, options, ...body, derived: derive(body, anchor) }
}
