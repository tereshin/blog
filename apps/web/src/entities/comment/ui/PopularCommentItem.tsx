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

/** Аватар и подписи в шапке; текст и поставленные реакции под ней на всю ширину. */
export function PopularCommentItem({ comment }: PopularCommentItemProps) {
  const { t, locale } = useT()
  const appearances = useCommentReactionGlyphs()
  const reactions = appearances.filter((appearance) => comment.reaction_counts[appearance.kind] > 0)
  return (
    <li>
      <Link
        to={comment.href}
        className="flex flex-col rounded-md text-inherit outline-offset-4 hover:opacity-80"
      >
        <span className="flex min-w-0 items-center gap-2.5">
          <Avatar
            src={comment.author_avatar_url}
            name={comment.author_name}
            size="sm"
            className="size-9 shrink-0"
          />
          <span className="flex min-w-0 flex-1 flex-col text-[13px] leading-[18px]">
            <span className="flex min-w-0 items-baseline gap-1">
              <span className="min-w-0 truncate font-medium">{comment.author_name}</span>
              <span className="shrink-0 text-muted dark:text-[#969c9d]">
                {t('comment.in_post')}
              </span>
            </span>
            <span className="truncate font-medium">{comment.article_title}</span>
          </span>
        </span>
        <span className="mt-1.5 line-clamp-3 text-[15px] leading-[22px]">{comment.excerpt}</span>
        {reactions.length > 0 ? (
          <span className="mt-2.5 flex items-center gap-1.5 text-[13px] leading-5 text-muted dark:text-[#969c9d]">
            <span className="inline-flex shrink-0 items-center gap-1 text-base leading-5">
              {reactions.map((appearance) => (
                <span
                  key={appearance.kind}
                  aria-label={`${t(REACTION_NAME[appearance.kind])} ${formatCount(comment.reaction_counts[appearance.kind], locale)}`}
                  className="inline-flex items-center"
                >
                  {appearance.presentation === 'emoji' ? (
                    <span aria-hidden="true">{appearance.emoji}</span>
                  ) : (
                    <FallbackImage
                      src={appearance.image_url}
                      label={t(REACTION_NAME[appearance.kind])}
                      className="inline-block size-4 object-contain"
                    />
                  )}
                </span>
              ))}
            </span>
            <span>
              {t('comment.reactions', {
                count: comment.reaction_count,
                value: formatCount(comment.reaction_count, locale),
              })}
            </span>
          </span>
        ) : null}
      </Link>
    </li>
  )
}
