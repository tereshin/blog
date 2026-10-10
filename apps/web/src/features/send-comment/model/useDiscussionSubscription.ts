import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  commentKeys,
  getDiscussionSubscription,
  setDiscussionSubscription,
} from '@/entities/comment'
import { memberMutationBlock, useViewer } from '@/entities/session'
import { sessionEvents } from '@/shared/api'
import { useT } from '@/shared/i18n'
import { useToast } from '@/shared/ui'
export function useDiscussionSubscription(article_id: string) {
  const { t } = useT()
  const { viewer } = useViewer()
  const toast = useToast()
  const client = useQueryClient()
  const query = useQuery({
    queryKey: commentKeys.subscription(article_id),
    queryFn: ({ signal }) => getDiscussionSubscription(article_id, signal),
    enabled: viewer.status === 'member',
  })
  const enabled = query.data?.is_subscribed ?? false
  const mutation = useMutation({
    mutationFn: () => setDiscussionSubscription(article_id, !enabled),
    onSuccess: (value) => client.setQueryData(commentKeys.subscription(article_id), value),
    onError: () => toast.error(t('error.unknown')),
  })
  return {
    enabled,
    is_pending: mutation.isPending || (viewer.status === 'member' && query.isPending),
    toggle: () => {
      if (viewer.status !== 'member') {
        sessionEvents.emit('login_required')
        return
      }
      const block = memberMutationBlock(viewer)
      if (block) {
        toast.error(t(block === 'restricted' ? 'comment.restricted' : 'login.email_unverified'))
        return
      }
      mutation.mutate()
    },
  }
}
