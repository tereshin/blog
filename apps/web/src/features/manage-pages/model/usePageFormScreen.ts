import { useEffect, useRef, useState } from 'react'
import { useBlocker, useNavigate } from 'react-router'
import type { AdminPage } from '@/entities/page'
import { memberMutationBlock, useViewer } from '@/entities/session'
import { usePageForm } from './usePageForm.ts'
import type { PageSnapshot } from './usePageForm.ts'

export function usePageFormScreen({
  initial,
  read,
  acknowledge,
  is_dirty,
  is_ready,
}: {
  initial: AdminPage | null
  read: () => Promise<PageSnapshot>
  acknowledge: (snapshot: PageSnapshot) => Promise<boolean>
  is_dirty: boolean
  is_ready: boolean
}) {
  const form = usePageForm({ initial, read, acknowledge })
  const { viewer, is_superadmin } = useViewer()
  const navigate = useNavigate()
  const [confirm_delete, setConfirmDelete] = useState(false)
  const skip_leave = useRef(false)
  const dirty = is_dirty || form.metadata_dirty
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      !skip_leave.current && dirty && currentLocation.pathname !== nextLocation.pathname,
  )
  const can_write = is_superadmin && memberMutationBlock(viewer) === null
  const mutation_disabled = !can_write || !is_ready || form.is_pending
  const disabled = mutation_disabled || form.can_retry

  useEffect(() => {
    if (form.is_deleted) {
      skip_leave.current = true
      navigate('/admin/pages')
    }
  }, [form.is_deleted, navigate])

  useEffect(() => {
    if (!dirty) return
    const warn = (event: BeforeUnloadEvent) => event.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  async function remove() {
    await form.submit('delete')
    setConfirmDelete(false)
  }

  function handleReload(): void {
    skip_leave.current = true
    window.location.assign(`/admin/pages/${form.saved?.id}`)
  }

  return {
    form,
    dirty,
    blocker,
    disabled,
    mutation_disabled,
    confirm_delete,
    setConfirmDelete,
    handleReload,
    remove,
  }
}
