import type { WelcomeContent } from '@blog/contracts'
import { BlockEditor } from './BlockEditor.tsx'
import { EditorPanel } from './EditorPanel.tsx'
import { EditorWindow } from './EditorWindow.tsx'
import { useWelcomeEditor } from '../model/useWelcomeEditor.ts'
import { useT } from '@/shared/i18n'
import { Button, Dialog } from '@/shared/ui'

export function WelcomeEditor({
  initial,
  onClose,
}: {
  initial: WelcomeContent | null
  onClose: () => void
}) {
  const { t } = useT()
  const editor_state = useWelcomeEditor({ initial, onClose })
  const {
    editor,
    title,
    setTitle,
    is_ready,
    setReady,
    is_fullscreen,
    setFullscreen,
    preview,
    setPreview,
    error,
    uploads,
    mutation,
    disabled,
    confirm_close,
    setConfirmClose,
    close,
    save,
    showPreview,
  } = editor_state

  return (
    <>
      <EditorWindow label={t('welcome.title')} is_fullscreen={is_fullscreen} onClose={close}>
        <EditorPanel
          header={<span>{t('welcome.title')}</span>}
          metadata={
            error ? (
              <p role="alert" className="text-danger">
                {error}
              </p>
            ) : null
          }
          is_fullscreen={is_fullscreen}
          onToggleFullscreen={() => setFullscreen((current) => !current)}
          onClose={close}
          preview={preview ? { title: preview.title, blocks: preview.document.blocks } : null}
          footer={
            <>
              <Button variant="primary" isDisabled={disabled} onPress={() => void save()}>
                {t(mutation.isPending ? 'profile.saving' : 'common.save')}
              </Button>
              <Button
                variant="ghost"
                isDisabled={!is_ready || uploads > 0 || mutation.isPending}
                onPress={() => (preview ? setPreview(null) : void showPreview())}
              >
                {t(preview ? 'pages.back_editor' : 'editor.preview')}
              </Button>
              {initial ? (
                <Button variant="ghost" isDisabled={disabled} onPress={() => void save(true)}>
                  {t('welcome.remove')}
                </Button>
              ) : null}
            </>
          }
        >
          <BlockEditor
            initial={initial?.document ?? null}
            title={title}
            onTitleChange={setTitle}
            title_placeholder={t('editor.title')}
            placeholder={t('editor.placeholder')}
            handle_ref={editor.ref}
            onDirty={editor.markDirty}
            onReady={() => setReady(true)}
          />
        </EditorPanel>
      </EditorWindow>
      <Dialog is_open={confirm_close} onOpenChange={setConfirmClose}>
        <Dialog.Header>
          <Dialog.Heading>{t('editor.leave_title')}</Dialog.Heading>
        </Dialog.Header>
        <Dialog.Body>{t('editor.leave_body')}</Dialog.Body>
        <Dialog.Footer>
          <Button onPress={() => setConfirmClose(false)}>{t('editor.stay')}</Button>
          <Button onPress={onClose}>{t('editor.leave')}</Button>
        </Dialog.Footer>
      </Dialog>
    </>
  )
}
