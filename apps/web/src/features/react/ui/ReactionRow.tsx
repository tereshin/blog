import { useT } from '@/shared/i18n'
import { formatCount } from '@/shared/lib'
import { Button, Menu } from '@/shared/ui'
import { REACTION_EMOJI, REACTION_KINDS, REACTION_LABEL } from '@/entities/reaction'
import type { ReactionCounts, ReactionKind } from '@/entities/reaction'

type ReactionRowProps = {
  counts: ReactionCounts
  my_reaction: ReactionKind | null
  onSelect: (kind: ReactionKind) => void
  is_pending?: boolean
  /** Гость: «добавить» сразу зовёт вход и не открывает меню видов. */
  onAdd?: () => void
}

/** Ряд реакций: вид с ненулевым числом — пилюля, «добавить» открывает меню из четырёх видов. */
export function ReactionRow({ counts, my_reaction, onSelect, is_pending = false, onAdd }: ReactionRowProps) {
  const { t, locale } = useT()
  const visible = REACTION_KINDS.filter((kind) => counts[kind] > 0)
  return (
    <div className="flex flex-wrap items-center gap-2">
      {visible.map((kind) => (
        <Button
          key={kind}
          variant={my_reaction === kind ? 'primary' : 'secondary'}
          size="sm"
          aria-pressed={my_reaction === kind}
          aria-label={`${t(REACTION_LABEL[kind])} ${formatCount(counts[kind], locale)}`}
          isDisabled={is_pending}
          onPress={() => onSelect(kind)}
        >
          <span aria-hidden="true">{REACTION_EMOJI[kind]}</span>
          {formatCount(counts[kind], locale)}
        </Button>
      ))}
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
            {REACTION_KINDS.map((kind) => (
              <Menu.Item key={kind} id={kind} textValue={t(REACTION_LABEL[kind])}>
                <span aria-hidden="true">{REACTION_EMOJI[kind]}</span> {t(REACTION_LABEL[kind])}
              </Menu.Item>
            ))}
          </Menu.Content>
        </Menu>
      )}
    </div>
  )
}
