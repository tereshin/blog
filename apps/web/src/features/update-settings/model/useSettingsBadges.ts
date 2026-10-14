import type { BadgeDefinition } from '@blog/contracts'

export type ChangeBadges = (update: (badges: BadgeDefinition[]) => BadgeDefinition[]) => void

export function useSettingsBadges(badges: BadgeDefinition[], onChange: ChangeBadges) {
  const patch = (id: string, value: Partial<BadgeDefinition>) =>
    onChange((current) =>
      current.map((badge) => (badge.id === id ? { ...badge, ...value } : badge)),
    )
  const move = (index: number, direction: number) => {
    const next = [...badges]
    const current = next[index]
    const target = next[index + direction]
    if (!current || !target) return
    next[index] = target
    next[index + direction] = current
    onChange(() => next)
  }
  return { patch, move }
}
