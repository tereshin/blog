import { useViewer } from '@/entities/session'
import { useT } from '@/shared/i18n'
import { Button } from '@/shared/ui'
import { useCommentDrafts } from '../model/useCommentDrafts.ts'
import { useSendComment } from '../model/useSendComment.ts'

type ReplyTarget = { id: string; name: string }

type CommentFormProps = {
  article_id: string
  comments_enabled: boolean
  parent: ReplyTarget | null
  onCancelReply: () => void
  onSent: () => void
  /** Гость не отправляет комментарий: страница открывает вход и оставляет текст. */
  requireSession: (action: () => void) => void
}

/** Поле комментария или ответа. Выключенное обсуждение поля не показывает. */
export function CommentForm({ article_id, comments_enabled, parent, onCancelReply, onSent, requireSession }: CommentFormProps) {
  const { t } = useT()
  const { viewer } = useViewer()
  const draft = useCommentDrafts(article_id, parent?.id ?? null)
  const send = useSendComment(article_id, (sent_parent) => {
    draft.clear()
    // Успех корневого комментария не сбрасывает ответ, который успели начать, пока запрос был в пути.
    if (sent_parent) onSent()
  })
  if (!comments_enabled) return null
  if (viewer.status === 'member' && viewer.user.is_restricted) {
    return <p className="py-4 text-sm text-muted">{t('comment.restricted')}</p>
  }

  const submit = () => {
    const body = draft.text.trim()
    if (!body || send.is_pending) return
    requireSession(() => {
      send.send(body, parent?.id ?? null)
    })
  }

  return (
    <form
      className="flex flex-col gap-2 py-4"
      onSubmit={(event) => {
        event.preventDefault()
        submit()
      }}
    >
      {parent ? (
        <div className="flex items-center justify-between gap-2 text-sm">
          <span>{t('comment.reply_to', { name: parent.name })}</span>
          <Button type="button" variant="ghost" size="sm" onPress={onCancelReply}>
            {t('comment.cancel_reply')}
          </Button>
        </div>
      ) : null}
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-muted">{t('comment.counter', { count: draft.text.length })}</span>
        <textarea
          value={draft.text}
          maxLength={5000}
          rows={3}
          placeholder={t('comment.placeholder')}
          aria-label={t('comment.placeholder')}
          className="rounded-lg border border-separator bg-background px-3 py-2"
          onChange={(event) => draft.update(event.target.value)}
        />
      </label>
      {send.error ? <p className="text-sm text-danger">{send.error}</p> : null}
      <div className="flex gap-2">
        <Button type="submit" variant="primary" isDisabled={draft.text.trim().length === 0 || send.is_pending}>
          {send.error ? t('comment.retry') : t('comment.send')}
        </Button>
      </div>
    </form>
  )
}
