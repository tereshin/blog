import { reactionAppearancesSchema } from '@blog/contracts'
import type { ReactionAppearances } from '@blog/contracts'
import type { ReactionKind } from '@/entities/reaction'

export type AppearanceDraft = {
  kind: ReactionKind
  presentation: 'emoji' | 'image'
  emoji: string
  image_url: string
}

const GRAPHEMES = new Intl.Segmenter(undefined, { granularity: 'grapheme' })

export function isSingleEmoji(emoji: string): boolean {
  const segments = [...GRAPHEMES.segment(emoji)]
  const grapheme = segments.length === 1 ? (segments[0]?.segment ?? '') : ''
  return grapheme.length > 0 && /\p{Extended_Pictographic}/u.test(grapheme)
}

export function draftsFrom(appearances: ReactionAppearances): AppearanceDraft[] {
  return appearances.map((item) => ({
    kind: item.kind,
    presentation: item.presentation,
    emoji: item.presentation === 'emoji' ? item.emoji : '',
    image_url: item.presentation === 'image' ? item.image_url : '',
  }))
}

export function appearanceErrors(drafts: readonly AppearanceDraft[]): Partial<Record<ReactionKind, 'emoji' | 'image'>> {
  const errors: Partial<Record<ReactionKind, 'emoji' | 'image'>> = {}
  for (const item of drafts) {
    if (item.presentation === 'emoji' && !isSingleEmoji(item.emoji)) errors[item.kind] = 'emoji'
    if (item.presentation === 'image' && item.image_url.trim().length === 0) errors[item.kind] = 'image'
  }
  return errors
}

export function appearancePayload(drafts: readonly AppearanceDraft[]): ReactionAppearances {
  return reactionAppearancesSchema.parse(
    drafts.map((item) =>
      item.presentation === 'emoji'
        ? { kind: item.kind, presentation: 'emoji', emoji: item.emoji }
        : { kind: item.kind, presentation: 'image', image_url: item.image_url },
    ),
  )
}
