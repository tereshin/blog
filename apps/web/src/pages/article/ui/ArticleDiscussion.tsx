import { useState } from 'react'
import { useSearchParams } from 'react-router'
import { useRecordView } from '@/entities/article'
import type { ArticleModel } from '@/entities/article'
import { CommentThread, useComments } from '@/entities/comment'
import { useViewer } from '@/entities/session'
import { useRequireSession } from '@/features/login'
import { CommentModerationActions } from '@/features/moderate-content'
import { ReactionControl } from '@/features/react'
import { CommentActions, CommentForm } from '@/features/send-comment'

type ArticleDiscussionProps = { article: ArticleModel }

/** Обсуждение статьи: дерево, реакции, свои действия, форма и один засчитанный просмотр. */
export function ArticleDiscussion({ article }: ArticleDiscussionProps) {
  const [params] = useSearchParams()
  const { is_admin } = useViewer()
  const from_moderation = params.get('from') === 'moderation'
  const comments = useComments(article.id)
  const requireSession = useRequireSession()
  const [reply, setReply] = useState<{ id: string; name: string; anchor_id: string } | null>(null)
  useRecordView({ id: article.id, slug: article.slug }, from_moderation)

  const openReply = (target: { id: string; name: string; anchor_id: string }) => {
    setReply((current) => (current?.anchor_id === target.anchor_id ? null : target))
  }

  return (
    <div className="flex flex-col gap-4">
      <CommentForm
        article_id={article.id}
        comments_enabled={article.comments_enabled}
        parent={null}
        onCancelReply={() => undefined}
        onSent={() => undefined}
        requireSession={requireSession}
      />
      <CommentThread
        state={comments}
        renderReactions={(comment) => (
          <ReactionControl
            target_type="comment"
            target_id={comment.id}
            slug={article.slug}
            counts={comment.reaction_counts}
            my_reaction={comment.my_reaction}
          />
        )}
        renderActions={(comment, placement) => (
          <>
            <CommentActions comment={comment} placement={placement} article_id={article.id} onReply={openReply} />
            {from_moderation && is_admin ? (
              <CommentModerationActions article_id={article.id} comment_id={comment.id} status={comment.status} />
            ) : null}
          </>
        )}
        renderReply={(comment) =>
          reply?.anchor_id === comment.id ? (
            <CommentForm
              key={reply.anchor_id}
              article_id={article.id}
              comments_enabled={article.comments_enabled}
              parent={{ id: reply.id, name: reply.name }}
              onCancelReply={() => setReply(null)}
              onSent={() => setReply(null)}
              requireSession={requireSession}
            />
          ) : null
        }
      />
    </div>
  )
}
