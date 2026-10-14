import { useNavigate } from 'react-router'
import { useState } from 'react'
import { RequireRole } from '@/entities/session'
import { useT } from '@/shared/i18n'
import { ErrorState } from '@/shared/ui'
import { usePageEditor } from '../model/usePageEditor.ts'
import { EditorWindow } from './EditorWindow.tsx'
import { EditorPanel } from './EditorPanel.tsx'
import { PageDocumentEditor } from './PageDocumentEditor.tsx'
import { EditorSkeleton } from './EditorSkeleton.tsx'

/** Freeze only the authorized initial data; session expiry must not unmount the local editor. */
export function PageEditor({ id }: { id?: string }) {
  const { t } = useT()
  const navigate = useNavigate()
  const [is_fullscreen, setFullscreen] = useState(false)
  const onClose = () => navigate('/admin/pages')
  const panel_controls = {
    is_fullscreen,
    onClose,
    onToggleFullscreen: () => setFullscreen((current) => !current),
  }
  const { query, opened } = usePageEditor(id)
  return (
    <EditorWindow label={t('pages.title')} is_fullscreen={is_fullscreen} onClose={onClose}>
      {opened ? (
        <PageDocumentEditor
          initial={opened.initial}
          renderPanel={(slots) => <EditorPanel {...slots} {...panel_controls} />}
        />
      ) : (
        <EditorPanel {...panel_controls} header={<span>{t('pages.title')}</span>} footer={null}>
          <RequireRole role="superadmin">
            {query.isError ? (
              <ErrorState title={t('pages.load_error')} onRetry={() => void query.refetch()} />
            ) : (
              <EditorSkeleton />
            )}
          </RequireRole>
        </EditorPanel>
      )}
    </EditorWindow>
  )
}
