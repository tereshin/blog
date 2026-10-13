import { useEffect, useState, useSyncExternalStore } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { WelcomeContent } from '@blog/contracts'
import { settingsKeys, toPublicSettings } from '@/entities/settings'
import { memberMutationBlock, useViewer } from '@/entities/session'
import { getAdminSettings, updateSettings } from '@/features/update-settings'
import { BlockEditor } from './BlockEditor.tsx'
import { EditorPanel } from './EditorPanel.tsx'
import { EditorWindow } from './EditorWindow.tsx'
import { useEditorDocument } from '../model/useEditorDocument.ts'
import { subscribeEditorUploads, editorUploadCount } from '../lib/editor-uploader.ts'
import { useT } from '@/shared/i18n'
import { Button, Dialog, useToast } from '@/shared/ui'

export function WelcomeEditor({
  initial,
  onClose,
}: {
  initial: WelcomeContent | null
  onClose: () => void
}) {
  const { t } = useT()
  const toast = useToast()
  const query_client = useQueryClient()
  const { viewer, is_superadmin } = useViewer()
  const editor = useEditorDocument()
  const [confirm_close, setConfirmClose] = useState(false)
  const [title, setTitle] = useState(initial?.title ?? '')
  const [is_ready, setReady] = useState(false)
  const [is_fullscreen, setFullscreen] = useState(false)
  const [preview, setPreview] = useState<WelcomeContent | null>(null)
  const [error, setError] = useState<string | null>(null)
  const uploads = useSyncExternalStore(subscribeEditorUploads, editorUploadCount, () => 0)
  const mutation = useMutation({
    mutationFn: async (welcome_content: WelcomeContent | null) =>
      updateSettings({ ...(await getAdminSettings()), welcome_content }),
    onSuccess: (settings) => {
      query_client.setQueryData(settingsKeys.admin(), settings)
      query_client.setQueryData(settingsKeys.public(), toPublicSettings(settings))
      toast.success(t('admin.settings.saved'))
    },
  })
  const disabled =
    !is_ready ||
    uploads > 0 ||
    mutation.isPending ||
    !is_superadmin ||
    memberMutationBlock(viewer) !== null
  function close() {
    if (mutation.isPending) return
    if (editor.is_dirty) setConfirmClose(true)
    else onClose()
  }
  useEffect(() => {
    if (!editor.is_dirty) return
    const warn = (event: BeforeUnloadEvent) => event.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [editor.is_dirty])
  async function save(is_remove = false) {
    setError(null)
    try {
      const snapshot = await editor.readSnapshot()
      await mutation.mutateAsync(
        is_remove || (!snapshot.title.trim() && snapshot.document.blocks.length === 0)
          ? null
          : { title: snapshot.title, document: snapshot.document },
      )
      if (is_remove || (await editor.acknowledge(snapshot))) onClose()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t('admin.settings.error'))
    }
  }
  async function showPreview() {
    try {
      const snapshot = await editor.readSnapshot()
      setPreview({ title: snapshot.title, document: snapshot.document })
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t('admin.settings.error'))
    }
  }
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
