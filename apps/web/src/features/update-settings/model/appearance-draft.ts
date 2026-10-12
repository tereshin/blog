import { MAX_ACTIVE_REACTIONS, reactionAppearancesSchema } from '@blog/contracts'
import type { ReactionAppearance, ReactionAppearances } from '@blog/contracts'

export type AppearanceDraft = {
  kind: string
  label: string
  status: 'active' | 'retired'
  presentation: 'emoji' | 'image'
  emoji: string
  image_url: string
}

export type AppearanceFieldError = 'emoji' | 'image' | 'label'

const GRAPHEMES = new Intl.Segmenter(undefined, { granularity: 'grapheme' })

export function isSingleEmoji(emoji: string): boolean {
  const segments = [...GRAPHEMES.segment(emoji)]
  const grapheme = segments.length === 1 ? (segments[0]?.segment ?? '') : ''
  return grapheme.length > 0 && /\p{Extended_Pictographic}/u.test(grapheme)
}

export function draftsFrom(appearances: ReactionAppearances): AppearanceDraft[] {
  return appearances.map((item) => ({
    kind: item.kind,
    label: item.label,
    status: item.status,
    presentation: item.presentation,
    emoji: item.presentation === 'emoji' ? item.emoji : '',
    image_url: item.presentation === 'image' ? item.image_url : '',
  }))
}

export function activeDrafts(drafts: readonly AppearanceDraft[]): AppearanceDraft[] {
  return drafts.filter((item) => item.status === 'active')
}

export function retiredDrafts(drafts: readonly AppearanceDraft[]): AppearanceDraft[] {
  return drafts.filter((item) => item.status === 'retired')
}

function ordered(drafts: readonly AppearanceDraft[]): AppearanceDraft[] {
  return [...activeDrafts(drafts), ...retiredDrafts(drafts)]
}

export function moveActive(drafts: readonly AppearanceDraft[], from_kind: string, to_kind: string): AppearanceDraft[] {
  const active = activeDrafts(drafts)
  const from = active.findIndex((item) => item.kind === from_kind)
  const to = active.findIndex((item) => item.kind === to_kind)
  if (from < 0 || to < 0 || from === to) return [...drafts]
  const next = [...active]
  const [moved] = next.splice(from, 1)
  if (!moved) return [...drafts]
  next.splice(to, 0, moved)
  return [...next, ...retiredDrafts(drafts)]
}

export function retireDraft(drafts: readonly AppearanceDraft[], kind: string): AppearanceDraft[] {
  if (activeDrafts(drafts).length <= 1) return [...drafts]
  return ordered(drafts.map((item) => (item.kind === kind ? { ...item, status: 'retired' } : item)))
}

export function restoreDraft(drafts: readonly AppearanceDraft[], kind: string): AppearanceDraft[] {
  if (activeDrafts(drafts).length >= MAX_ACTIVE_REACTIONS) return [...drafts]
  return ordered(drafts.map((item) => (item.kind === kind ? { ...item, status: 'active' } : item)))
}

export function appendDraft(drafts: readonly AppearanceDraft[], draft: AppearanceDraft): AppearanceDraft[] {
  if (activeDrafts(drafts).length >= MAX_ACTIVE_REACTIONS) return [...drafts]
  return [...activeDrafts(drafts), { ...draft, status: 'active' }, ...retiredDrafts(drafts)]
}

export function appearanceErrors(
  drafts: readonly AppearanceDraft[],
): Partial<Record<string, AppearanceFieldError>> {
  const errors: Partial<Record<string, AppearanceFieldError>> = {}
  for (const item of drafts) {
    if (item.label.trim().length === 0) errors[item.kind] = 'label'
    else if (item.presentation === 'emoji' && !isSingleEmoji(item.emoji)) errors[item.kind] = 'emoji'
    else if (item.presentation === 'image' && item.image_url.trim().length === 0) errors[item.kind] = 'image'
  }
  return errors
}

function toAppearance(item: AppearanceDraft): ReactionAppearance {
  const base = { kind: item.kind, label: item.label.trim(), status: item.status }
  return item.presentation === 'emoji'
    ? { ...base, presentation: 'emoji', emoji: item.emoji }
    : { ...base, presentation: 'image', image_url: item.image_url }
}

export function appearancePayload(drafts: readonly AppearanceDraft[]): ReactionAppearances {
  return reactionAppearancesSchema.parse(ordered(drafts).map(toAppearance))
}
