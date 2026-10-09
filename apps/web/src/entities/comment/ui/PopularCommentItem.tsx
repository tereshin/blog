import { Link } from 'react-router'
import type { ReactionKind } from '@blog/contracts'
import { useT } from '@/shared/i18n'
import type { MessageKey } from '@/shared/i18n'
import { formatCount } from '@/shared/lib'
import { Avatar, FallbackImage } from '@/shared/ui'
import type { PopularCommentModel } from '../api/comment-schema.ts'
import { useCommentReactionGlyphs } from '../model/comment-reaction-glyphs.tsx'

const REACTION_NAME: Record<ReactionKind, MessageKey> = {
  laugh: 'reaction.laugh',
  heart: 'reaction.heart',
  thumb: 'reaction.thumb',
  fire: 'reaction.fire',
}

type PopularCommentItemProps = { comment: PopularCommentModel }

/** Запись правой карточки (FR-068): аватар, имя, «в посте», усечённое название, фрагмент, «N реакций». */
export function PopularCommentItem({ comment }: PopularCommentItemProps) {
  const { t, locale } = useT()
  const appearances = useCommentReactionGlyphs()
  return (
    <li>
      <Link
        to={comment.href}
        className="flex gap-3 rounded-xl p-2 text-foreground outline-offset-2 hover:bg-surface-secondary"
      >
        <Avatar src={comment.author_avatar_url} name={comment.author_name} size="sm" className="mt-0.5 shrink-0" />
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="truncate text-sm font-medium">{comment.author_name}</span>
          <span className="flex min-w-0 text-xs text-muted">
            <span className="shrink-0">{t('comment.in_post')} «</span>
            <span className="min-w-0 truncate">{comment.article_title}</span>
            <span className="shrink-0">»</span>
          </span>
          <span className="line-clamp-3 text-sm">{comment.excerpt}</span>
          <span className="flex flex-wrap items-center gap-1 text-xs text-muted">
            <span className="inline-flex items-center gap-0.5">
              {appearances.map((appearance) =>
                appearance.presentation === 'emoji' ? (
                  <span key={appearance.kind} aria-hidden="true">
                    {appearance.emoji}
                  </span>
                ) : (
                  <FallbackImage
                    key={appearance.kind}
                    src={appearance.image_url}
                    label={t(REACTION_NAME[appearance.kind])}
                    className="inline-block h-3.5 w-3.5 object-contain"
                  />
                ),
              )}
            </span>
            <span>{t('comment.reactions', { count: comment.reaction_count, value: formatCount(comment.reaction_count, locale) })}</span>
          </span>
        </span>
      </Link>
    </li>
  )
}
