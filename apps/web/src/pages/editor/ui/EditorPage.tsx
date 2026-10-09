import { useQuery } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { useBlocker, useNavigate, useParams } from 'react-router'
import { articleKeys, getArticleDraft } from '@/entities/article'
import type { ArticleDraft } from '@/entities/article'
import { memberMutationBlock, useViewer } from '@/entities/session'
import { useTopics } from '@/entities/topic'
import { useLoginDialog } from '@/features/login'
import { PublishPanel, UnsavedChangesDialog, usePublishArticle } from '@/features/publish-article'
import { useT } from '@/shared/i18n'
import { EmptyState } from '@/shared/ui'
import { BlockEditor, EditorSkeleton, useEditorDocument } from '@/widgets/editor'
import { useShellStore } from '@/widgets/shell'

const EMPTY_DOCUMENT = { blocks: [] }

export default function EditorPage() {
  const { id } = useParams()
  const { t } = useT()
  const navigate = useNavigate()
  const { viewer } = useViewer()
  const openLogin = useLoginDialog((state) => state.open)
  const setHeaderCenter = useShellStore((state) => state.setHeaderCenter)
  const setArticleTopicId = useShellStore((state) => state.setArticleTopicId)
  const topics = useTopics()
  const draft_query = useQuery({
    queryKey: articleKeys.draft(id ?? ''),
    queryFn: ({ signal }) => getArticleDraft(id ?? '', signal),
    enabled: Boolean(id),
  })
  const [local, setLocal] = useState<ArticleDraft | null>(null)
  const draft = local && (id === undefined || id === local.id) ? local : (draft_query.data ?? null)
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
    setHeaderCenter({ kind: 'pill' })
    setArticleTopicId(null)
  }, [setHeaderCenter, setArticleTopicId])

  useEffect(() => {
    if (viewer.status === 'guest') openLogin('required')
  }, [viewer.status, openLogin])

  useEffect(() => {
    if (!is_dirty) return
    const on_leave = (event: BeforeUnloadEvent) => {
      event.preventDefault()
    }
    window.addEventListener('beforeunload', on_leave)
    return () => window.removeEventListener('beforeunload', on_leave)
  }, [is_dirty])

  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) => dirty_ref.current && currentLocation.pathname !== nextLocation.pathname,
  )

  const publishing = usePublishArticle({
    article_id: draft?.id,
    read_document: editor.save,
    on_saved: (next) => {
      dirty_ref.current = false
      editor.resetDirty()
      setLocal(next)
      if (id === next.id) return
      skip_block.current = true
      navigate(`/write/${next.id}`, { replace: true })
    },
  })

  const block = memberMutationBlock(viewer)
  const can_write = viewer.status === 'member' && viewer.user.can_publish && block === null
  const waiting = viewer.status === 'loading' || (can_write && (topics.isPending || (Boolean(id) && !draft && draft_query.isPending)))

  return (
    <div className="flex flex-col gap-4 p-4">
      {waiting ? <EditorSkeleton /> : null}
      {viewer.status === 'guest' ? <EmptyState title={t('editor.guest')} /> : null}
      {block === 'restricted' ? <EmptyState title={t('editor.restricted')} /> : null}
      {block === 'email_unverified' ? <EmptyState title={t('login.email_unverified')} /> : null}
      {viewer.status === 'member' && block === null && !viewer.user.can_publish ? (
        <EmptyState title={t('editor.cannot_publish')} />
      ) : null}
      {can_write && id && !draft && draft_query.isError ? <EmptyState title={t('editor.not_found')} /> : null}
      {can_write && !waiting && !(id && !draft) && topics.data ? (
        <>
          <PublishPanel
            initial={draft}
            topics={topics.data}
            editor_ready={editor_ready}
            is_pending={publishing.is_pending}
            slug_error={publishing.slug_error}
            reasons={publishing.reasons}
            onDirty={setFormDirty}
            onSubmit={publishing.submit}
          />
          <BlockEditor
            initial={draft?.blocks ?? EMPTY_DOCUMENT}
            placeholder={t('editor.placeholder')}
            handle_ref={editor.ref}
            onDirty={editor.markDirty}
            onReady={() => setEditorReady(true)}
          />
        </>
      ) : null}
      <UnsavedChangesDialog
        is_open={blocker.state === 'blocked'}
        onStay={() => {
          if (blocker.state === 'blocked') blocker.reset()
        }}
        onLeave={() => {
          if (blocker.state === 'blocked') blocker.proceed()
        }}
      />
    </div>
  )
}
