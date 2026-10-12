import { useState } from 'react'
import { useCommentReactors } from '../model/useCommentReactors.ts'
import type { CommentNode } from '@/entities/comment'
import { useSettings } from '@/entities/settings'
import { FALLBACK_REACTION_APPEARANCES, reactionCount } from '@/entities/reaction'
import { useT } from '@/shared/i18n'
import { Avatar, Button, ErrorState } from '@/shared/ui'

export function CommentReactors({ comment }: { comment: CommentNode }) {
  const { t } = useT()
  const { data } = useSettings()
  const appearances = (data?.reaction_appearances ?? FALLBACK_REACTION_APPEARANCES).filter(
    (item) => reactionCount(comment.reaction_counts, item.kind) > 0,
  )
  const [kind, setKind] = useState(comment.my_reaction ?? appearances[0]?.kind ?? 'heart')
  const { query, items } = useCommentReactors(comment.id, kind)
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2" role="group" aria-label={t('comment.view_reactions')}>
        {appearances.map((item) => (
          <Button
            key={item.kind}
            size="sm"
            variant={item.kind === kind ? 'secondary' : 'ghost'}
            aria-pressed={item.kind === kind}
            onPress={() => setKind(item.kind)}
          >
            {item.label} {reactionCount(comment.reaction_counts, item.kind)}
          </Button>
        ))}
      </div>
      {query.isPending ? (
        <p role="status">{t('common.loading')}</p>
      ) : query.isError ? (
        <ErrorState title={t('comment.load_error')} onRetry={() => void query.refetch()} />
      ) : items.length ? (
        <ul className="flex flex-col gap-3">
          {items.map((user) => (
            <li key={user.user_id} className="flex items-center gap-3">
              <Avatar name={user.display_name} src={user.avatar_url} size="sm" />
              <span>{user.display_name}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted">{t('comment.no_reactions')}</p>
      )}
      {query.hasNextPage ? (
        <Button
          variant="ghost"
          isDisabled={query.isFetchingNextPage}
          onPress={() => void query.fetchNextPage()}
        >
          {t('feed.load_more')}
        </Button>
      ) : null}
    </div>
  )
}
