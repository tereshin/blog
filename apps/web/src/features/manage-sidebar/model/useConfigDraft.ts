import { useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { z } from 'zod'
import { ApiError } from '@/shared/api'

export function useConfigDraft<T extends { version: number }>({
  query_key,
  load,
  save,
  schema,
  public_key,
}: {
  query_key: readonly string[]
  load: (signal?: AbortSignal) => Promise<T>
  save: (value: T, key: string) => Promise<T>
  schema: z.ZodType<T>
  public_key: readonly string[]
}) {
  const client = useQueryClient()
  const query = useQuery({
    queryKey: query_key,
    queryFn: ({ signal }) => load(signal),
    staleTime: Infinity,
  })
  const [draft, setDraft] = useState<T | null>(null)
  const [baseline, setBaseline] = useState<T | null>(null)
  const operation = useRef({ fingerprint: '', key: '' })
  const [is_invalid, setInvalid] = useState(false)
  const mutation = useMutation({
    mutationFn: (value: T) => save(value, operation.current.key),
    onSuccess: (value) => {
      setBaseline(value)
      setDraft(value)
      client.setQueryData(query_key, value)
      void client.invalidateQueries({ queryKey: public_key })
    },
  })
  const config = draft ?? query.data
  const saved = baseline ?? query.data
  const is_dirty = Boolean(config && JSON.stringify(config) !== JSON.stringify(saved))
  function change(value: T) {
    if (!baseline && query.data) setBaseline(query.data)
    setDraft(value)
    setInvalid(false)
    mutation.reset()
  }
  function submit() {
    if (!config) return
    const parsed = schema.safeParse(config)
    setInvalid(!parsed.success)
    if (!parsed.success) return
    const fingerprint = JSON.stringify(parsed.data)
    if (fingerprint !== operation.current.fingerprint)
      operation.current = { fingerprint, key: crypto.randomUUID() }
    mutation.mutate(parsed.data)
  }
  function cancel() {
    setDraft(saved ?? null)
    mutation.reset()
    setInvalid(false)
  }
  async function reload() {
    const result = await query.refetch()
    if (result.data) {
      setBaseline(result.data)
      setDraft(result.data)
      mutation.reset()
      setInvalid(false)
    }
  }
  return {
    query,
    config,
    change,
    submit,
    cancel,
    reload,
    is_dirty,
    is_invalid,
    mutation,
    is_conflict: mutation.error instanceof ApiError && mutation.error.status === 409,
  }
}
export type ConfigDraft<T extends { version: number }> = ReturnType<typeof useConfigDraft<T>>
