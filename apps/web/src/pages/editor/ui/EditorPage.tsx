import { PublishPanel, UnsavedChangesDialog } from '@/features/publish-article'
import { useT } from '@/shared/i18n'
import { CloseButton, EmptyState } from '@/shared/ui'
import {
  BlockEditor,
  EditorSkeleton,
  EditorWindow,
  EditorPanel,
} from '@/widgets/editor'
import { useEditorPage } from '../model/useEditorPage.ts'

const EMPTY_DOCUMENT = { blocks: [] }

function WindowNotice({ title, onClose }: { title: string; onClose: () => void }) {
  const { t } = useT()
  return (
    <div>
      <div className="flex justify-end px-3 pt-3">
        <CloseButton aria-label={t('common.close')} onPress={onClose} />
      </div>
      <EmptyState title={title} />
    </div>
  )
}

export default function EditorPage() {
  const { t } = useT()
  const page = useEditorPage()
  const {
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
  } = page

  return (
    <EditorWindow label={t('header.write')} onClose={requestClose} is_fullscreen={is_fullscreen}>
      {waiting ? (
        <div className="p-5">
          <EditorSkeleton />
        </div>
      ) : null}
      {!opened && viewer.status === 'guest' ? (
        <WindowNotice title={t('editor.guest')} onClose={requestClose} />
      ) : null}
      {!opened && block === 'restricted' ? (
        <WindowNotice title={t('editor.restricted')} onClose={requestClose} />
      ) : null}
      {!opened && block === 'email_unverified' ? (
        <WindowNotice title={t('login.email_unverified')} onClose={requestClose} />
      ) : null}
      {!opened && viewer.status === 'member' && block === null && !viewer.user.can_publish ? (
        <WindowNotice title={t('editor.cannot_publish')} onClose={requestClose} />
      ) : null}
      {!opened && can_write && id && !draft && draft_query.isError ? (
        <WindowNotice title={t('editor.not_found')} onClose={requestClose} />
      ) : null}
      {opened ? (
        <PublishPanel
          renderPanel={(slots) => (
            <EditorPanel
              {...slots}
              is_fullscreen={is_fullscreen}
              onToggleFullscreen={() => setFullscreen((current) => !current)}
              onClose={requestClose}
            />
          )}
          initial={draft}
          topics={opened.topics}
          readDocument={editor.save}
          editor_ready={editor_ready}
          is_pending={publishing.is_pending}
          slug_error={publishing.slug_error}
          reasons={publishing.reasons}
          saved={
            Boolean(draft?.id) && !is_dirty ? (
              <span role="status" className="text-xs text-muted">
                {t('editor.saved')} ✓
              </span>
            ) : null
          }
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
