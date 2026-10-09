import { useCallback, useRef, useState } from 'react'
import type { RefObject } from 'react'
import type { BlocksDocument } from '@blog/contracts'

export type BlockEditorHandle = {
  save: () => Promise<BlocksDocument>
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
  return { ref: ref as RefObject<BlockEditorHandle | null>, is_dirty, markDirty, resetDirty, save }
}
