import { useSettings } from '@/entities/settings'
import { useViewer } from '@/entities/session'
import { FALLBACK_REACTION_APPEARANCES } from '@/entities/reaction'
import { ReactionRow } from './ReactionRow.tsx'
import { useReaction } from '../model/useReaction.ts'
import type { ReactionTarget } from '../model/useReaction.ts'

/** Ряд реакций, привязанный к мутации. Числа и выбранный вид приходят из discussion, картинка — из настроек. */
export function ReactionControl(props: ReactionTarget) {
  const { viewer } = useViewer()
  const { data } = useSettings()
  const { react, is_pending } = useReaction(props)
  const appearances = data?.reaction_appearances ?? FALLBACK_REACTION_APPEARANCES
  const first_active = appearances.find((item) => item.status === 'active')?.kind ?? 'laugh'
  const ask_login = viewer.status === 'guest' ? () => react(props.my_reaction ?? first_active) : undefined
  return (
    <ReactionRow
      appearances={appearances}
      counts={props.counts}
      my_reaction={props.my_reaction}
      onSelect={react}
      is_pending={is_pending}
      {...(ask_login ? { onAdd: ask_login } : {})}
    />
  )
}
