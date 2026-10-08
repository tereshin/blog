import { useViewer } from '@/entities/session'
import { ReactionRow } from './ReactionRow.tsx'
import { useReaction } from '../model/useReaction.ts'
import type { ReactionTarget } from '../model/useReaction.ts'

/** Ряд реакций, привязанный к мутации. Гость видит диалог входа, числа не меняются. */
export function ReactionControl(props: ReactionTarget) {
  const { viewer } = useViewer()
  const { react, is_pending } = useReaction(props)
  const ask_login = viewer.status === 'guest' ? () => react(props.my_reaction ?? 'laugh') : undefined
  return (
    <ReactionRow
      counts={props.counts}
      my_reaction={props.my_reaction}
      onSelect={react}
      is_pending={is_pending}
      {...(ask_login ? { onAdd: ask_login } : {})}
    />
  )
}
