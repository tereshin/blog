import { useCallback, useRef, useState } from 'react'
import type { RefObject } from 'react'
import type { BlocksDocument } from '@blog/contracts'

export type EditorSnapshot = { title: string; document: BlocksDocument; fingerprint: string }

export type BlockEditorHandle = {
  save: () => Promise<BlocksDocument>
  readSnapshot: () => Promise<EditorSnapshot>
  acknowledge: (snapshot: EditorSnapshot) => Promise<boolean>
}

/** Состояние документа редактора: флаг правок и сохранение в документ контракта. */
export function useEditorDocument() {
  const ref = useRef<BlockEditorHandle>(null)
  const [is_dirty, setDirty] = useState(false)
  const markDirty = useCallback(() => setDirty(true), [])
  const resetDirty = useCallback(() => setDirty(false), [])
  const save = useCallback(async () => {
    const editor = ref.current
    if (!editor) throw new Error('Редактор ещё не готов')
    return editor.save()
  }, [])
  const readSnapshot = useCallback(async () => {
    if (!ref.current) throw new Error('Редактор ещё не готов')
    return ref.current.readSnapshot()
  }, [])
  const acknowledge = useCallback(async (snapshot: EditorSnapshot) => {
    if (!ref.current) return false
    const matches = await ref.current.acknowledge(snapshot)
    setDirty(!matches)
    return matches
  }, [])
  return {
    readSnapshot,
    acknowledge,
    ref: ref as RefObject<BlockEditorHandle | null>,
    is_dirty,
    markDirty,
    resetDirty,
    save,
  }
}
