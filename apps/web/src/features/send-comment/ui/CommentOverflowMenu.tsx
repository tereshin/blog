import { useState } from 'react'
import type { CommentNode } from '@/entities/comment'
import { useViewer } from '@/entities/session'
import { useT } from '@/shared/i18n'
import { BaseIcon, Button, Dialog, Menu, useToast } from '@/shared/ui'
import { useCommentInteractions } from '../model/useCommentInteractions.ts'
import { CommentReactors } from './CommentReactors.tsx'
import { CommentReportForm } from './CommentReportForm.tsx'

type CommentOverflowMenuProps = { comment: CommentNode; onEdit?: () => void; onDelete?: () => void }
export function CommentOverflowMenu({ comment, onEdit, onDelete }: CommentOverflowMenuProps) {
  const { t } = useT()
  const { is_own } = useViewer()
  const toast = useToast()
  const [dialog, setDialog] = useState<'reactions' | 'report' | null>(null)
  const { bookmark, report, authorize } = useCommentInteractions(comment)
  const copyLink = async () => {
    const url = new URL(window.location.href)
    url.hash = `comment-${comment.id}`
    try {
      await navigator.clipboard.writeText(url.href)
      toast.success(t('comment.link_copied'))
    } catch {
      toast.error(t('comment.copy_failed'))
    }
  }
  return (
    <>
      <Menu>
        <Button
          variant="ghost"
          size="sm"
          isIconOnly
          className="text-muted"
          aria-label={t('comment.more')}
        >
          <BaseIcon name="more_1" style="line" size={20} />
        </Button>
        <Menu.Content
          aria-label={t('comment.more')}
          onAction={(key) => {
            if (key === 'reactions') setDialog('reactions')
            if (key === 'copy') void copyLink()
            if (key === 'bookmark') authorize(() => bookmark.mutate())
            if (key === 'report')
              authorize(() => {
                report.reset()
                setDialog('report')
              })
            if (key === 'edit') onEdit?.()
            if (key === 'delete') onDelete?.()
          }}
        >
          <Menu.Item id="reactions" textValue={t('comment.view_reactions')}>
            <BaseIcon name="happy" style="line" size={18} />
            {t('comment.view_reactions')}
          </Menu.Item>
          <Menu.Item id="copy" textValue={t('comment.copy_link')}>
            <BaseIcon name="link" style="line" size={18} />
            {t('comment.copy_link')}
          </Menu.Item>
          <Menu.Item
            id="bookmark"
            isDisabled={bookmark.isPending}
            textValue={t(comment.is_bookmarked ? 'comment.unbookmark' : 'comment.bookmark')}
          >
            <BaseIcon name="bookmark" style={comment.is_bookmarked ? 'fill' : 'line'} size={18} />
            {t(comment.is_bookmarked ? 'comment.unbookmark' : 'comment.bookmark')}
          </Menu.Item>
          {!is_own(comment.author.user_id) ? (
            <Menu.Item id="report" textValue={t('comment.report')}>
              <BaseIcon name="flag_1" style="line" size={18} />
              {t('comment.report')}
            </Menu.Item>
          ) : null}
          {onEdit ? (
            <Menu.Item id="edit" textValue={t('common.edit')}>
              <BaseIcon name="pencil" style="line" size={18} />
              {t('common.edit')}
            </Menu.Item>
          ) : null}
          {onDelete ? (
            <Menu.Item id="delete" variant="danger" textValue={t('common.delete')}>
              <BaseIcon name="delete_2" style="line" size={18} />
              {t('common.delete')}
            </Menu.Item>
          ) : null}
        </Menu.Content>
      </Menu>
      <Dialog
        is_open={dialog !== null}
        onOpenChange={(open) => {
          if (!open) setDialog(null)
        }}
      >
        <Dialog.Header>
          <Dialog.Heading>
            {t(dialog === 'report' ? 'comment.report' : 'comment.view_reactions')}
          </Dialog.Heading>
        </Dialog.Header>
        <Dialog.Body>
          {dialog === 'reactions' ? (
            <CommentReactors comment={comment} />
          ) : dialog === 'report' ? (
            <CommentReportForm
              is_pending={report.isPending}
              error={report.isError}
              onSubmit={(reason) => report.mutate(reason, { onSuccess: () => setDialog(null) })}
            />
          ) : null}
        </Dialog.Body>
        <Dialog.Footer>
          <Button variant="ghost" slot="close">
            {t('common.close')}
          </Button>
        </Dialog.Footer>
      </Dialog>
    </>
  )
}
