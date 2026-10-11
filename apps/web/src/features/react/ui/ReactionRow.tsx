import type { ReactionAppearance, ReactionAppearances } from '@blog/contracts'
import { useT } from '@/shared/i18n'
import { formatCount } from '@/shared/lib'
import { BaseIcon, Menu } from '@/shared/ui'
import {
  FALLBACK_REACTION_APPEARANCES,
  REACTION_KINDS,
  REACTION_LABEL,
  ReactionGlyph,
} from '@/entities/reaction'
import type { ReactionCounts, ReactionKind } from '@/entities/reaction'
import { ReactionButton } from './ReactionButton.tsx'

type ReactionRowProps = {
  counts: ReactionCounts
  my_reaction: ReactionKind | null
  onSelect: (kind: ReactionKind) => void
  is_pending?: boolean
  /** Гость: «добавить» сразу зовёт вход и не открывает меню видов. */
  onAdd?: () => void
  appearances?: ReactionAppearances
}

function appearanceOf(appearances: ReactionAppearances, kind: ReactionKind): ReactionAppearance {
  return (
    appearances.find((item) => item.kind === kind) ??
    FALLBACK_REACTION_APPEARANCES[REACTION_KINDS.indexOf(kind)] ??
    FALLBACK_REACTION_APPEARANCES[0]
  )
}

/** Ряд реакций: вид с ненулевым числом — пилюля, «добавить» открывает меню из четырёх видов. */
export function ReactionRow({
  counts,
  my_reaction,
  onSelect,
  is_pending = false,
  onAdd,
  appearances = FALLBACK_REACTION_APPEARANCES,
}: ReactionRowProps) {
  const { t, locale } = useT()
  const visible = REACTION_KINDS.filter((kind) => counts[kind] > 0 || kind === my_reaction)
  if (visible.length === 0) visible.push(appearances[0]?.kind ?? REACTION_KINDS[0])
  return (
    <div className="flex flex-wrap items-center gap-2">
      {visible.map((kind) => {
        const appearance = appearanceOf(appearances, kind)
        const label = t(REACTION_LABEL[kind])
        return (
          <ReactionButton
            key={kind}
            variant={my_reaction === kind ? 'primary' : 'secondary'}
            size="sm"
            className="gap-1 text-base tabular-nums"
            aria-pressed={my_reaction === kind}
            aria-label={counts[kind] > 0 ? `${label} ${formatCount(counts[kind], locale)}` : label}
            isDisabled={is_pending}
            onPress={() => onSelect(kind)}
          >
            <ReactionGlyph appearance={appearance} label={label} />
            {counts[kind] > 0 ? formatCount(counts[kind], locale) : null}
          </ReactionButton>
        )
      })}
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
        <Menu>
          <ReactionButton
            variant="secondary"
            size="sm"
            isIconOnly
            className="text-muted"
            aria-label={t('reaction.add')}
            isDisabled={is_pending}
          >
            <BaseIcon name="add" style="line" size={18} />
          </ReactionButton>
          <Menu.Content
            aria-label={t('reaction.menu')}
            onAction={(key) => onSelect(String(key) as ReactionKind)}
          >
            {REACTION_KINDS.map((kind) => {
              const label = t(REACTION_LABEL[kind])
              return (
                <Menu.Item key={kind} id={kind} textValue={label}>
                  <span className="inline-flex items-center gap-1">
                    <ReactionGlyph
                      appearance={appearanceOf(appearances, kind)}
                      label={label}
                      hide_label_on_error
                    />
                    <span>{label}</span>
                  </span>
                </Menu.Item>
              )
            })}
          </Menu.Content>
        </Menu>
      )}
    </div>
  )
}
