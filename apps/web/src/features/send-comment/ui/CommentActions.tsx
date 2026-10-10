import { useState } from 'react'
import type { CommentNode, CommentPlacement } from '@/entities/comment'
import { useViewer } from '@/entities/session'
import { useT } from '@/shared/i18n'
import { Button, Dialog } from '@/shared/ui'
import { useDeleteComment } from '../model/useDeleteComment.ts'
import { useEditComment } from '../model/useEditComment.ts'

type ReplyTarget = { id: string; name: string; anchor_id: string }

type CommentActionsProps = {
  comment: CommentNode
  placement: CommentPlacement
  article_id: string
  onReply: (target: ReplyTarget) => void
}

/** Ответ, правка и удаление своей реплики. Заглушка и ещё не доехавший комментарий действий не имеют. */
export function CommentActions({ comment, placement, article_id, onReply }: CommentActionsProps) {
  const { t } = useT()
  const { is_own } = useViewer()
  const edit = useEditComment(article_id)
  const remove = useDeleteComment(article_id)
  const [is_editing, setEditing] = useState(false)
  const [text, setText] = useState(comment.body ?? '')
  const [is_open, setOpen] = useState(false)
  if (comment.status !== 'visible') return null

  if (is_editing) {
    return (
      <form
        className="flex w-full flex-col gap-2"
        onSubmit={(event) => {
          event.preventDefault()
          const body = text.trim()
          if (!body) return
          edit.save(comment.id, body)
          setEditing(false)
        }}
      >
        <textarea
          value={text}
          maxLength={5000}
          rows={3}
          aria-label={t('common.edit')}
          className="rounded-lg border border-separator bg-background px-3 py-2"
          onChange={(event) => setText(event.target.value)}
        />
        <div className="flex gap-2">
          <Button type="submit" variant="primary" size="sm" isDisabled={text.trim().length === 0 || edit.is_pending}>
            {t('comment.save')}
          </Button>
          <Button type="button" variant="ghost" size="sm" onPress={() => setEditing(false)}>
            {t('common.cancel')}
          </Button>
        </div>
      </form>
    )
  }

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onPress={() =>
          onReply({
            id: placement.root_id ?? comment.id,
            name: comment.author.display_name,
            anchor_id: comment.id,
          })
        }
      >
        {t('comment.reply')}
      </Button>
      {is_own(comment.author.user_id) ? (
        <>
          <Button variant="ghost" size="sm" onPress={() => setEditing(true)}>
            {t('common.edit')}
          </Button>
          <Button variant="ghost" size="sm" onPress={() => setOpen(true)}>
            {t('common.delete')}
          </Button>
          <Dialog is_open={is_open} onOpenChange={setOpen}>
            <Dialog.Header>
              <Dialog.Heading>{t('comment.delete_title')}</Dialog.Heading>
            </Dialog.Header>
            <Dialog.Body>
              <p className="text-muted">{t('comment.delete_body')}</p>
            </Dialog.Body>
            <Dialog.Footer>
              <Button variant="ghost" slot="close">
                {t('common.cancel')}
              </Button>
              <Button
                variant="primary"
                isDisabled={remove.is_pending}
                onPress={() => {
                  remove.remove(comment.id)
                  setOpen(false)
                }}
              >
                {t('common.delete')}
              </Button>
            </Dialog.Footer>
          </Dialog>
        </>
      ) : null}
    </>
  )
}
