import { useQuery } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useBlocker, useNavigate, useParams } from 'react-router'
import { articleKeys, getArticleDraft } from '@/entities/article'
import type { ArticleDraft } from '@/entities/article'
import { memberMutationBlock, useViewer } from '@/entities/session'
import { useTopics } from '@/entities/topic'
import { useLoginDialog } from '@/features/login'
import { PublishPanel, UnsavedChangesDialog, usePublishArticle } from '@/features/publish-article'
import { useT } from '@/shared/i18n'
import { Button, EmptyState } from '@/shared/ui'
import { BlockEditor, EditorSkeleton, useEditorDocument } from '@/widgets/editor'
import { useShellStore } from '@/widgets/shell'

const EMPTY_DOCUMENT = { blocks: [] }

function EditorWindow({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  const { t } = useT()
  return (
    <div
      className="fixed inset-x-0 bottom-0 top-14 z-30 flex items-start justify-center overflow-y-auto bg-black/50 p-3 backdrop-blur-sm sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('header.write')}
        className="my-4 w-full max-w-[680px] rounded-2xl border border-separator bg-overlay text-foreground shadow-2xl"
        onMouseDown={(event) => event.stopPropagation()}
      >
        {children}
      </div>
    </div>
  )
}

function WindowNotice({ title, onClose }: { title: string; onClose: () => void }) {
  const { t } = useT()
  return (
    <div>
      <div className="flex justify-end px-3 pt-3">
        <Button variant="ghost" isIconOnly aria-label={t('common.close')} onPress={onClose}>
          <span aria-hidden="true" className="text-lg leading-none">
            ×
          </span>
        </Button>
      </div>
      <EmptyState title={title} />
    </div>
  )
}

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
    setHeaderCenter({ kind: 'empty' })
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

  const requestClose = () => navigate('/')

  useEffect(() => {
    const on_key = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented || blocker.state === 'blocked') return
      navigate('/')
    }
    window.addEventListener('keydown', on_key)
    return () => window.removeEventListener('keydown', on_key)
  }, [blocker.state, navigate])

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
    <EditorWindow onClose={requestClose}>
      {waiting ? (
        <div className="p-5">
          <EditorSkeleton />
        </div>
      ) : null}
      {viewer.status === 'guest' ? <WindowNotice title={t('editor.guest')} onClose={requestClose} /> : null}
      {block === 'restricted' ? <WindowNotice title={t('editor.restricted')} onClose={requestClose} /> : null}
      {block === 'email_unverified' ? <WindowNotice title={t('login.email_unverified')} onClose={requestClose} /> : null}
      {viewer.status === 'member' && block === null && !viewer.user.can_publish ? (
        <WindowNotice title={t('editor.cannot_publish')} onClose={requestClose} />
      ) : null}
      {can_write && id && !draft && draft_query.isError ? <WindowNotice title={t('editor.not_found')} onClose={requestClose} /> : null}
      {can_write && !waiting && !(id && !draft) && topics.data ? (
        <PublishPanel
          initial={draft}
          topics={topics.data}
          editor_ready={editor_ready}
          is_pending={publishing.is_pending}
          slug_error={publishing.slug_error}
          reasons={publishing.reasons}
          show_saved={Boolean(draft?.id) && !is_dirty}
          onClose={requestClose}
          onDirty={setFormDirty}
          onSubmit={publishing.submit}
        >
          <BlockEditor
            initial={draft?.blocks ?? EMPTY_DOCUMENT}
            placeholder={t('editor.placeholder')}
            handle_ref={editor.ref}
            onDirty={editor.markDirty}
            onReady={() => setEditorReady(true)}
          />
        </PublishPanel>
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
    </EditorWindow>
  )
}
