import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useEditorDocument } from './useEditorDocument.ts'
describe('editor acknowledgement', () => {
  it('keeps edits typed during a save dirty and clears only matching snapshots', async () => {
    const { result } = renderHook(() => useEditorDocument())
    const first = { title: 'First', document: { blocks: [] }, fingerprint: 'first' }
    const second = { ...first, title: 'Second', fingerprint: 'second' }
    act(() => {
      result.current.ref.current = {
        save: async () => second.document,
        readSnapshot: async () => second,
        acknowledge: async (snapshot) => snapshot.fingerprint === second.fingerprint,
      }
      result.current.markDirty()
    })
    await act(async () => {
      expect(await result.current.acknowledge(first)).toBe(false)
    })
    expect(result.current.is_dirty).toBe(true)
    await act(async () => {
      expect(await result.current.acknowledge(second)).toBe(true)
    })
    expect(result.current.is_dirty).toBe(false)
  })
})
