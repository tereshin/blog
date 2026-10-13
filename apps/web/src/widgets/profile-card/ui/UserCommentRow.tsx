import { Link } from 'react-router'
import type { CommentNode, UserCommentModel } from '@/entities/comment'
import type { Profile } from '@/entities/profile'
import { FALLBACK_REACTION_APPEARANCES } from '@/entities/reaction'
import { useSettings } from '@/entities/settings'
import { useViewer } from '@/entities/session'
import { ReactionButton, ReactionRow, useReaction } from '@/features/react'
import { CommentOverflowMenu } from '@/features/send-comment'
import { useT } from '@/shared/i18n'
import { formatTime } from '@/shared/lib'
import { Avatar, BaseIcon, Card } from '@/shared/ui'

type UserCommentRowProps = { comment: UserCommentModel; profile: Profile }

/** Карточка комментария профиля с контекстом статьи и действиями обсуждения. */
export function UserCommentRow({ comment, profile }: UserCommentRowProps) {
  const { t } = useT()
  const { viewer } = useViewer()
  const { data: settings } = useSettings()
  const appearances = settings?.reaction_appearances ?? FALLBACK_REACTION_APPEARANCES
  const status_icon = settings?.profile_status_icons.find(
    (icon) => icon.id === profile.status_icon_id,
  )
  const heart = appearances.find((item) => item.kind === 'heart' && item.status === 'active')
  const first_kind = appearances.find((item) => item.status === 'active')?.kind ?? 'heart'
  const { react, is_pending } = useReaction({
    target_type: 'comment',
    target_id: comment.id,
    slug: comment.article_slug,
    counts: comment.reaction_counts,
    my_reaction: comment.my_reaction,
  })
  const node: CommentNode = {
    ...comment,
    author: {
      user_id: profile.user_id,
      display_name: profile.display_name,
      avatar_url: profile.avatar_url,
    },
    body: comment.excerpt,
    status: 'visible',
    edited_at: null,
    time_label: formatTime(comment.created_at),
    replies: [],
  }

  return (
    <li>
      <Card className="rounded-xl">
        <Card.Content className="flex flex-col gap-3 p-4">
          <div className="flex min-w-0 items-center gap-2.5">
            <Avatar
              src={profile.avatar_url}
              name={profile.display_name}
              size="sm"
              className="size-9 shrink-0"
            />
            <div className="min-w-0 flex-1 text-[13px] leading-[18px]">
              <div className="flex min-w-0 items-center gap-1">
                <span className="min-w-0 truncate font-semibold">{profile.display_name}</span>
                {status_icon ? (
                  <img
                    src={status_icon.image_url}
                    alt={status_icon.label}
                    width={18}
                    height={18}
                    className="size-[18px] shrink-0 object-contain"
                  />
                ) : null}
                <span className="shrink-0 text-muted">{t('comment.in_post')}</span>
              </div>
              <div className="flex min-w-0 items-baseline gap-2">
                <Link
                  to={`/p/${encodeURIComponent(comment.article_slug)}`}
                  className="min-w-0 max-w-[205px] truncate font-semibold outline-offset-2 hover:underline"
                >
                  {comment.article_title}
                </Link>
                <time className="shrink-0 text-muted" dateTime={comment.created_at}>
                  {node.time_label}
                </time>
              </div>
            </div>
          </div>
          <Link
            to={comment.href}
            className="whitespace-pre-wrap break-words text-[16px] leading-6 outline-offset-2 hover:underline"
          >
            {comment.excerpt}
          </Link>
          <div className="[&_.reaction-button[aria-pressed=false]]:text-muted">
            <ReactionRow
              counts={comment.reaction_counts}
              my_reaction={comment.my_reaction}
              appearances={appearances}
              onSelect={react}
              is_pending={is_pending}
              {...(viewer.status === 'guest' ? { onAdd: () => react(first_kind) } : {})}
            >
              {heart && !comment.reaction_counts['heart'] && comment.my_reaction !== 'heart' ? (
                <ReactionButton
                  variant="secondary"
                  isIconOnly
                  aria-label={heart.label}
                  aria-pressed={false}
                  isDisabled={is_pending}
                  className="text-muted"
                  onPress={() => react('heart')}
                >
                  <BaseIcon name="heart" style="line" size={18} />
                </ReactionButton>
              ) : null}
            </ReactionRow>
          </div>
          <div className="flex items-center gap-5 text-[15px] leading-6 text-muted">
            <Link to={comment.href} className="outline-offset-2 hover:text-foreground">
              {t('comment.reply')}
            </Link>
            <CommentOverflowMenu comment={node} href={comment.href} />
          </div>
        </Card.Content>
      </Card>
    </li>
  )
}
