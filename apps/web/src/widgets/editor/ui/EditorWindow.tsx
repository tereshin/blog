import type { ReactNode } from 'react'
import { Dialog } from '@/shared/ui'

export function EditorWindow({
  children,
  onClose,
  is_fullscreen,
  label,
}: {
  children: ReactNode
  onClose: () => void
  is_fullscreen: boolean
  label: string
}) {
  return (
    <Dialog
      is_open
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
      aria-label={label}
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
