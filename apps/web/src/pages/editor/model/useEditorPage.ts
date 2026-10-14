import { useQuery } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { useBlocker, useLocation, useNavigate, useParams } from 'react-router'
import { articleKeys, getArticleDraft } from '@/entities/article'
import type { ArticleDraft } from '@/entities/article'
import { memberMutationBlock, useViewer } from '@/entities/session'
import { useTopics } from '@/entities/topic'
import type { Topic } from '@/entities/topic'
import { useLoginDialogStore } from '@/features/login'
import { usePublishArticle } from '@/features/publish-article'
import { useEditorDocument } from '@/widgets/editor'

export function useEditorPage() {
  const { id } = useParams()
  const location = useLocation()
  const return_to =
    (location.state as { editor_return_to?: string } | null)?.editor_return_to ?? '/'
  const [is_fullscreen, setFullscreen] = useState(false)
  const navigate = useNavigate()
  const { viewer } = useViewer()
  const openLogin = useLoginDialogStore((state) => state.open)
  const topics = useTopics()
  const draft_query = useQuery({
    queryKey: articleKeys.draft(id ?? ''),
    queryFn: ({ signal }) => getArticleDraft(id ?? '', signal),
    enabled: Boolean(id) && viewer.status === 'member',
  })
  const [local, setLocal] = useState<ArticleDraft | null>(null)
  const [opened, setOpened] = useState<{ draft: ArticleDraft | null; topics: Topic[] } | null>(null)
  const draft =
    local && (id === undefined || id === local.id)
      ? local
      : (draft_query.data ?? opened?.draft ?? null)
  const editor = useEditorDocument()
  const [form_dirty, setFormDirty] = useState(false)
  const [editor_ready, setEditorReady] = useState(false)
  const dirty_ref = useRef(false)
  const skip_block = useRef(false)
  const is_dirty = editor.is_dirty || form_dirty

  useEffect(() => {
    if (skip_block.current) return
    dirty_ref.current = is_dirty
  }, [is_dirty])

  useEffect(() => {
    skip_block.current = false
  }, [id])

  useEffect(() => {
    if (viewer.status === 'guest' && !opened) openLogin('required')
  }, [viewer.status, opened, openLogin])

  useEffect(() => {
    if (!is_dirty) return
    const on_leave = (event: BeforeUnloadEvent) => {
      event.preventDefault()
    }
    window.addEventListener('beforeunload', on_leave)
    return () => window.removeEventListener('beforeunload', on_leave)
  }, [is_dirty])

  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      dirty_ref.current && currentLocation.pathname !== nextLocation.pathname,
  )

  const requestClose = () => navigate(return_to)

  const publishing = usePublishArticle({
    article_id: draft?.id,
    read_document: editor.save,
    on_saved: (next) => {
      dirty_ref.current = false
      editor.resetDirty()
      setLocal(next)
      if (id === next.id) return
      skip_block.current = true
      navigate(`/write/${next.id}`, { replace: true, state: { editor_return_to: return_to } })
    },
  })

  const block = memberMutationBlock(viewer)
  const can_write = viewer.status === 'member' && viewer.user.can_publish && block === null
  const waiting =
    !opened &&
    (viewer.status === 'loading' ||
      (can_write && (topics.isPending || (Boolean(id) && !draft && draft_query.isPending))))

  useEffect(() => {
    if (!opened && can_write && !waiting && !(id && !draft) && topics.data) {
      // Keep the authorized edit session alive when auth clears the query cache.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOpened({ draft, topics: topics.data })
    }
  }, [opened, can_write, waiting, id, draft, topics.data])

  return {
    viewer,
    block,
    can_write,
    waiting,
    opened,
    draft,
    draft_query,
    editor,
    is_dirty,
    is_fullscreen,
    setFullscreen,
    editor_ready,
    setEditorReady,
    setFormDirty,
    publishing,
    blocker,
    requestClose,
    id,
  }
}
