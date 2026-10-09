import type { ReactionAppearance, ReactionAppearances } from '@blog/contracts'
import { useT } from '@/shared/i18n'
import { formatCount } from '@/shared/lib'
import { Button, Menu } from '@/shared/ui'
import { FALLBACK_REACTION_APPEARANCES, REACTION_KINDS, REACTION_LABEL, ReactionGlyph } from '@/entities/reaction'
import type { ReactionCounts, ReactionKind } from '@/entities/reaction'

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
  return appearances.find((item) => item.kind === kind) ?? FALLBACK_REACTION_APPEARANCES[REACTION_KINDS.indexOf(kind)] ?? FALLBACK_REACTION_APPEARANCES[0]
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
  const visible = REACTION_KINDS.filter((kind) => counts[kind] > 0)
  return (
    <div className="flex flex-wrap items-center gap-2">
      {visible.map((kind) => {
        const appearance = appearanceOf(appearances, kind)
        const label = t(REACTION_LABEL[kind])
        return (
          <Button
            key={kind}
            variant={my_reaction === kind ? 'primary' : 'secondary'}
            size="sm"
            aria-pressed={my_reaction === kind}
            aria-label={`${label} ${formatCount(counts[kind], locale)}`}
            isDisabled={is_pending}
            onPress={() => onSelect(kind)}
          >
            <ReactionGlyph appearance={appearance} label={label} />
            {formatCount(counts[kind], locale)}
          </Button>
        )
      })}
      {onAdd ? (
        <Button variant="ghost" size="sm" aria-label={t('reaction.add')} isDisabled={is_pending} onPress={onAdd}>
          +
        </Button>
      ) : (
        <Menu>
          <Button variant="ghost" size="sm" aria-label={t('reaction.add')} isDisabled={is_pending}>
            +
          </Button>
          <Menu.Content aria-label={t('reaction.menu')} onAction={(key) => onSelect(String(key) as ReactionKind)}>
            {REACTION_KINDS.map((kind) => {
              const label = t(REACTION_LABEL[kind])
              return (
                <Menu.Item key={kind} id={kind} textValue={label}>
                  <span className="inline-flex items-center gap-1">
                    <ReactionGlyph appearance={appearanceOf(appearances, kind)} label={label} hide_label_on_error />
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
