import { useQuery } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useBlocker, useLocation, useNavigate, useParams } from 'react-router'
import { articleKeys, getArticleDraft } from '@/entities/article'
import type { ArticleDraft } from '@/entities/article'
import { memberMutationBlock, useViewer } from '@/entities/session'
import { useTopics } from '@/entities/topic'
import { useLoginDialog } from '@/features/login'
import { PublishPanel, UnsavedChangesDialog, usePublishArticle } from '@/features/publish-article'
import { useT } from '@/shared/i18n'
import { Button, Dialog, EmptyState } from '@/shared/ui'
import { BlockEditor, EditorSkeleton, useEditorDocument } from '@/widgets/editor'

const EMPTY_DOCUMENT = { blocks: [] }

function EditorWindow({
  children,
  onClose,
  is_fullscreen,
}: {
  children: ReactNode
  onClose: () => void
  is_fullscreen: boolean
}) {
  const { t } = useT()
  return (
    <Dialog
      is_open
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
      aria-label={t('header.write')}
      size="full"
      className={
        is_fullscreen
          ? 'article-editor-window article-editor-window--full'
          : 'article-editor-window'
      }
    >
      {children}
    </Dialog>
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
      <EmptyState title={title}>
        <Button variant="secondary" onPress={onClose}>{t('common.close')}</Button>
      </EmptyState>
    </div>
  )
}

export default function EditorPage() {
  const { id } = useParams()
  const location = useLocation()
  const return_to =
    (location.state as { editor_return_to?: string } | null)?.editor_return_to ?? '/'
  const [is_fullscreen, setFullscreen] = useState(false)
  const { t } = useT()
  const navigate = useNavigate()
  const { viewer } = useViewer()
  const openLogin = useLoginDialog((state) => state.open)
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
    viewer.status === 'loading' ||
    (can_write && (topics.isPending || (Boolean(id) && !draft && draft_query.isPending)))

  return (
    <EditorWindow onClose={requestClose} is_fullscreen={is_fullscreen}>
      {waiting ? (
        <div className="p-5">
          <EditorSkeleton />
        </div>
      ) : null}
      {viewer.status === 'guest' ? (
        <WindowNotice title={t('editor.guest')} onClose={requestClose} />
      ) : null}
      {block === 'restricted' ? (
        <WindowNotice title={t('editor.restricted')} onClose={requestClose} />
      ) : null}
      {block === 'email_unverified' ? (
        <WindowNotice title={t('login.email_unverified')} onClose={requestClose} />
      ) : null}
      {viewer.status === 'member' && block === null && !viewer.user.can_publish ? (
        <WindowNotice title={t('editor.cannot_publish')} onClose={requestClose} />
      ) : null}
      {can_write && id && !draft && draft_query.isError ? (
        <WindowNotice title={t('editor.not_found')} onClose={requestClose} />
      ) : null}
      {can_write && !waiting && !(id && !draft) && topics.data ? (
        <PublishPanel
          is_fullscreen={is_fullscreen}
          onToggleFullscreen={() => setFullscreen((current) => !current)}
          initial={draft}
          topics={topics.data}
          readDocument={editor.save}
          editor_ready={editor_ready}
          is_pending={publishing.is_pending}
          slug_error={publishing.slug_error}
          reasons={publishing.reasons}
          show_saved={Boolean(draft?.id) && !is_dirty}
          onClose={requestClose}
          onDirty={setFormDirty}
          onSubmit={publishing.submit}
        >
          {(title, onTitleChange) => (
            <BlockEditor
              title={title}
              title_placeholder={t('editor.title')}
              onTitleChange={onTitleChange}
              initial={draft?.blocks ?? EMPTY_DOCUMENT}
              placeholder={t('editor.placeholder')}
              handle_ref={editor.ref}
              onDirty={editor.markDirty}
              onReady={() => setEditorReady(true)}
            />
          )}
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
