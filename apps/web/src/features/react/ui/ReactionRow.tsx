import type { ReactionAppearance, ReactionAppearances } from '@blog/contracts'
import type { ReactNode } from 'react'
import { useT } from '@/shared/i18n'
import { formatCount } from '@/shared/lib'
import { BaseIcon } from '@/shared/ui'
import { FALLBACK_REACTION_APPEARANCES, ReactionGlyph, reactionCount } from '@/entities/reaction'
import type { ReactionCounts, ReactionKind } from '@/entities/reaction'
import { ReactionButton } from './ReactionButton.tsx'
import { ReactionPicker } from './ReactionPicker.tsx'

type ReactionRowProps = {
  counts: ReactionCounts
  my_reaction: ReactionKind | null
  onSelect: (kind: ReactionKind) => void
  is_pending?: boolean
  /** Гость: «добавить» сразу зовёт вход и не открывает меню видов. */
  onAdd?: () => void
  appearances?: ReactionAppearances
  children?: ReactNode
}

function appearanceOf(appearances: ReactionAppearances, kind: string): ReactionAppearance | undefined {
  return appearances.find((item) => item.kind === kind)
}

/** Ряд реакций: вид с ненулевым числом — пилюля, «добавить» открывает сетку активных видов. */
export function ReactionRow({
  counts,
  my_reaction,
  onSelect,
  is_pending = false,
  onAdd,
  appearances = FALLBACK_REACTION_APPEARANCES,
  children,
}: ReactionRowProps) {
  const { t, locale } = useT()
  const active = appearances.filter((item) => item.status === 'active')
  const known = new Set(appearances.map((item) => item.kind))
  const visible = [
    ...appearances.filter(
      (item) => reactionCount(counts, item.kind) > 0 || item.kind === my_reaction,
    ),
    ...Object.keys(counts)
      .filter((kind) => !known.has(kind) && reactionCount(counts, kind) > 0)
      .map(
        (kind) =>
          appearanceOf(FALLBACK_REACTION_APPEARANCES, kind) ?? {
            kind,
            label: kind,
            status: 'retired' as const,
            presentation: 'emoji' as const,
            emoji: '•',
          },
      ),
  ]
  if (visible.length === 0 && !children && active[0]) visible.push(active[0])
  return (
    <div className="flex flex-wrap items-center gap-2">
      {visible.map((appearance) => {
        const count = reactionCount(counts, appearance.kind)
        const label = appearance.label
        return (
          <ReactionButton
            key={appearance.kind}
            variant={my_reaction === appearance.kind ? 'primary' : 'secondary'}
            size="sm"
            className="gap-1 text-base tabular-nums"
            aria-pressed={my_reaction === appearance.kind}
            aria-label={count > 0 ? `${label} ${formatCount(count, locale)}` : label}
            isDisabled={is_pending}
            onPress={() => onSelect(appearance.kind)}
          >
            <ReactionGlyph appearance={appearance} label={label} />
            {count > 0 ? formatCount(count, locale) : null}
          </ReactionButton>
        )
      })}
      {children}
      {onAdd ? (
        <ReactionButton
          variant="secondary"
          size="sm"
          isIconOnly
          className="text-muted"
          aria-label={t('reaction.add')}
          isDisabled={is_pending}
          onPress={onAdd}
        >
          <BaseIcon name="add" style="line" size={18} />
        </ReactionButton>
      ) : (
        <ReactionPicker
          appearances={active}
          onSelect={onSelect}
          is_pending={is_pending}
        />
      )}
    </div>
  )
}
