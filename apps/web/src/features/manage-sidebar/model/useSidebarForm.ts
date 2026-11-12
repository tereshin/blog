import { useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { updateSidebarSchema, type Sidebar } from '@blog/contracts'
import { getAdminSidebar, saveSidebar, widgetKeys } from '@/entities/admin-widget'
import { ApiError } from '@/shared/api'
export function useSidebarForm() {
  const client = useQueryClient()
  const query = useQuery({
    queryKey: widgetKeys.admin,
    queryFn: ({ signal }) => getAdminSidebar(signal),
  })
  const [draft, setDraft] = useState<Sidebar | null>(null)
  const [is_invalid, setInvalid] = useState(false)
  const operation = useRef({ key: crypto.randomUUID(), fingerprint: '' })
  const mutation = useMutation({
    mutationFn: (config: Sidebar) => saveSidebar(config, operation.current.key),
    onSuccess: (saved) => {
      setDraft(saved)
      client.setQueryData(widgetKeys.admin, saved)
      void client.invalidateQueries({ queryKey: widgetKeys.sidebar })
    },
  })
  const config = draft ?? query.data
  function save() {
    if (!config) return
    const parsed = updateSidebarSchema.safeParse({
      sections: config.sections,
      expected_version: config.version,
    })
    setInvalid(!parsed.success)
    if (!parsed.success) return
    const fingerprint = JSON.stringify(config)
    if (fingerprint !== operation.current.fingerprint)
      operation.current = { key: crypto.randomUUID(), fingerprint }
    mutation.mutate(config)
  }
  const change = (value: Sidebar) => {
    setDraft(value)
    setInvalid(false)
    mutation.reset()
  }
  async function reload() {
    const result = await query.refetch()
    if (result.data) {
      setDraft(result.data)
      mutation.reset()
      setInvalid(false)
    }
  }
  return {
    query,
    config,
    change,
    is_invalid,
    mutation,
    save,
    reload,
    is_conflict: mutation.error instanceof ApiError && mutation.error.status === 409,
  }
}
