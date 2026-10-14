import type { BadgeDefinition } from '@blog/contracts'
export type BadgeFacts = {
  user_id: string
  reputation: number
  published_posts: number
  created_at: Date
}
export type BadgeRepository = {
  definitions: (is_exclusive?: boolean) => Promise<BadgeDefinition[]>
  hasAwards: (badge_ids: string[]) => Promise<boolean>
  facts: (user_ids: string[]) => Promise<BadgeFacts[]>
  award: (awards: { user_id: string; badge_id: string }[], now: Date) => Promise<void>
}

export type BadgeService = {
  evaluate: (user_id: string, now?: Date) => Promise<void>
  evaluateMany: (user_ids: string[], now?: Date) => Promise<void>
  validateReplacement: (next: BadgeDefinition[] | undefined) => Promise<BadgeDefinition[]>
}
