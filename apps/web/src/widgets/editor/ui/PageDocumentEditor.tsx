import { useState, useSyncExternalStore } from 'react'
import type { ReactNode } from 'react'
import type { EditorPanelSlots } from '@/shared/ui'

import type { AdminPage } from '@/entities/page'
import { PageForm } from '@/features/manage-pages'
import { useT } from '@/shared/i18n'
import { BlockEditor } from './BlockEditor.tsx'
import { useEditorDocument } from '../model/useEditorDocument.ts'
import { subscribeEditorUploads, editorUploadCount } from '../lib/editor-uploader.ts'

export function PageDocumentEditor({
  initial,
  renderPanel,
}: {
  initial: AdminPage | null
  renderPanel: (slots: EditorPanelSlots) => ReactNode
}) {
  const { t } = useT()
  const editor = useEditorDocument()
  const uploads = useSyncExternalStore(subscribeEditorUploads, editorUploadCount, () => 0)
  const [is_ready, setReady] = useState(false)
  return (
    <PageForm
      renderPanel={renderPanel}
      initial={initial}
      read={editor.readSnapshot}
      acknowledge={editor.acknowledge}
      is_dirty={editor.is_dirty}
      is_ready={is_ready && uploads === 0}
    >
      {(title, onTitleChange) => (
        <BlockEditor
          title={title}
          onTitleChange={onTitleChange}
          title_placeholder={t('editor.title')}
          initial={initial?.blocks ?? null}
          placeholder={t('editor.placeholder')}
          handle_ref={editor.ref}
          onDirty={editor.markDirty}
          onReady={() => setReady(true)}
        />
      )}
    </PageForm>
  )
}
