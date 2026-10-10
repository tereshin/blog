import { useMutation, useQueryClient } from '@tanstack/react-query'
import { commentKeys, reportComment, setCommentBookmark } from '@/entities/comment'
import type { CommentNode } from '@/entities/comment'
import { memberMutationBlock, useViewer } from '@/entities/session'
import { sessionEvents } from '@/shared/api'
import { useT } from '@/shared/i18n'
import { useToast } from '@/shared/ui'

export function useCommentInteractions(comment: CommentNode) {
  const query_client = useQueryClient()
  const { viewer } = useViewer()
  const { t } = useT()
  const toast = useToast()
  const authorize = (action: () => void) => {
    const block = memberMutationBlock(viewer)
    if (viewer.status !== 'member') {
      sessionEvents.emit('login_required')
      return
    }
    if (block) {
      toast.error(t(block === 'restricted' ? 'comment.restricted' : 'login.email_unverified'))
      return
    }
    action()
  }
  const bookmark = useMutation({
    mutationFn: () => setCommentBookmark(comment.id, !comment.is_bookmarked),
    onSuccess: () => {
      void query_client.invalidateQueries({ queryKey: commentKeys.all })
    },
    onError: () => toast.error(t('error.unknown')),
  })
  const report = useMutation({
    mutationFn: (reason: string) => reportComment(comment.id, reason),
    onSuccess: () => toast.success(t('comment.report_sent')),
    onError: () => toast.error(t('error.unknown')),
  })
  return { bookmark, report, authorize }
}
