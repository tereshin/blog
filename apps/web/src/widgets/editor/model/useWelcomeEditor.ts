import { useEffect, useState, useSyncExternalStore } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { WelcomeContent } from '@blog/contracts'
import { settingsKeys, toPublicSettings } from '@/entities/settings'
import { memberMutationBlock, useViewer } from '@/entities/session'
import { getAdminSettings, updateSettings } from '@/features/update-settings'
import { useT } from '@/shared/i18n'
import { useToast } from '@/shared/ui'
import { subscribeEditorUploads, editorUploadCount } from '../lib/editor-uploader.ts'
import { useEditorDocument } from './useEditorDocument.ts'

export function useWelcomeEditor({
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

  return {
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
  }
}
