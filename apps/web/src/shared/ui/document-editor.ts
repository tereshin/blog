import type { ReactNode } from 'react'
import type { DocumentBlock } from './document-block.ts'

/** Slots supplied by a document form; presentation is composed by the editor widget. */
export type EditorPanelSlots = {
  header: ReactNode
  metadata?: ReactNode
  children: ReactNode
  preview?: { title: string; blocks: DocumentBlock[] } | null
  footer: ReactNode
}
