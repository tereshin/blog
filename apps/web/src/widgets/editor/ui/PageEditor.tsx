import { useNavigate } from 'react-router'
import { EditorWindow } from './EditorWindow.tsx'
import { EditorPanel } from './EditorPanel.tsx'
import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getAdminPage, pageKeys } from '@/entities/page'
import type { AdminPage } from '@/entities/page'
import { useViewer, RequireRole } from '@/entities/session'
import { PageDocumentEditor } from './PageDocumentEditor.tsx'
import { EditorSkeleton } from './EditorSkeleton.tsx'
import { useT } from '@/shared/i18n'
import { ErrorState } from '@/shared/ui'

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
  const { is_superadmin } = useViewer()
  const query = useQuery({
    queryKey: pageKeys.admin(id ?? 'new'),
    queryFn: ({ signal }) => getAdminPage(id ?? '', signal),
    enabled: Boolean(id) && is_superadmin,
    retry: false,
  })
  const [opened, setOpened] = useState<{ initial: AdminPage | null } | null>(null)
  useEffect(() => {
    if (!opened && is_superadmin && (!id || query.data)) {
      // Persistent edit session is intentionally independent of the volatile auth/query cache.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOpened({ initial: query.data ?? null })
    }
  }, [opened, is_superadmin, id, query.data])
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
