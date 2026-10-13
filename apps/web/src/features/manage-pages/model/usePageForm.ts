import { ZodError } from 'zod'
import { useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { BlocksDocument, AdminPage, CreatePage, UpdatePage } from '@blog/contracts'
import { createPageSchema, updatePageSchema } from '@blog/contracts'
import { createPage, updatePage, deletePage, getAdminPage, pageKeys } from '@/entities/page'
import { seoKeys } from '@/entities/seo'
import { ApiError } from '@/shared/api'
import { useT } from '@/shared/i18n'
export type PageSnapshot = { title: string; document: BlocksDocument; fingerprint: string }
type Options = {
  initial: AdminPage | null
  read: () => Promise<PageSnapshot>
  acknowledge: (snapshot: PageSnapshot) => Promise<boolean>
}
type Pending = {
  mode: 'save' | 'published' | 'draft' | 'delete'
  key: string
  snapshot: PageSnapshot | null
  slug: string
  id?: string
  body: CreatePage | UpdatePage | { expected_version: number }
}
export function usePageForm({ initial, read, acknowledge }: Options) {
  const { t } = useT()
  const cache = useQueryClient()
  const [saved, setSaved] = useState(initial)
  const [slug, setSlug] = useState(initial?.slug ?? '')
  const [title, setTitle] = useState(initial?.title ?? '')
  const [metadata_dirty, setMetadataDirty] = useState(false)
  const slug_ref = useRef(slug)
  const [slug_error, setSlugError] = useState<string | undefined>(undefined)
  const [error, setError] = useState<string | null>(null)
  const [is_conflict, setConflict] = useState(false)
  const [server_version, setServerVersion] = useState<AdminPage | null>(null)
  const [preview, setPreview] = useState<PageSnapshot | null>(null)
  const busy = useRef(false)
  const [is_busy, setBusy] = useState(false)
  const [is_deleted, setDeleted] = useState(false)
  const [can_retry, setCanRetry] = useState(false)
  const pending = useRef<Pending | null>(null)
  const mutation = useMutation({
    mutationFn: async (op: Pending) => {
      if (op.mode === 'delete' && op.id && 'expected_version' in op.body) {
        await deletePage(op.id, op.body.expected_version, op.key)
        return null
      }
      return op.id
        ? updatePage(op.id, updatePageSchema.parse(op.body), op.key)
        : createPage(createPageSchema.parse(op.body), op.key)
    },
  })
  function changeSlug(value: string) {
    slug_ref.current = value
    setSlug(value)
    setMetadataDirty(true)
  }
  async function submit(mode: Pending['mode'], retry = false) {
    if (busy.current) return false
    busy.current = true
    setBusy(true)
    setError(null)
    setSlugError(undefined)
    setConflict(false)
    try {
      if (!retry || !pending.current) {
        const snapshot = mode === 'delete' ? null : await read()
        const fields = snapshot
          ? { title: snapshot.title.trim(), slug: slug_ref.current, blocks: snapshot.document }
          : {}
        const body = saved
          ? {
              ...fields,
              expected_version: saved.version,
              ...(mode === 'published' || mode === 'draft' ? { status: mode } : {}),
            }
          : fields
        pending.current = {
          mode,
          key: crypto.randomUUID(),
          snapshot,
          slug: slug_ref.current,
          ...(saved ? { id: saved.id } : {}),
          body: body as Pending['body'],
        }
      }
      const op = pending.current
      if (!op) return false
      const next = await mutation.mutateAsync(op)
      pending.current = null
      setCanRetry(false)
      if (next) {
        setSaved(next)
        cache.setQueryData(pageKeys.admin(next.id), next)
        setMetadataDirty(slug_ref.current !== op.slug)
        if (op.snapshot) await acknowledge(op.snapshot)
        await cache.invalidateQueries({ queryKey: pageKeys.public(next.slug) })
        await cache.invalidateQueries({ queryKey: seoKeys.page(`/pages/${next.slug}`) })
      } else if (saved) {
        setDeleted(true)
        cache.removeQueries({ queryKey: pageKeys.admin(saved.id), exact: true })
        await cache.invalidateQueries({ queryKey: pageKeys.public(saved.slug) })
        await cache.invalidateQueries({ queryKey: seoKeys.page(`/pages/${saved.slug}`) })
      }
      await cache.invalidateQueries({ queryKey: pageKeys.lists })
      return true
    } catch (cause) {
      const code = cause instanceof ApiError ? cause.code : ''
      const key =
        code === 'page_slug_taken'
          ? 'pages.slug_taken'
          : code === 'page_version_conflict'
            ? 'pages.conflict'
            : code === 'page_not_publishable'
              ? 'pages.empty_content'
              : code === 'page_slug_locked'
                ? 'pages.slug_locked'
                : null
      setError(
        key
          ? t(key)
          : cause instanceof ZodError
            ? t('pages.invalid_fields')
            : cause instanceof ApiError
              ? cause.message
              : t('editor.error.invalid_document'),
      )
      if (code === 'page_slug_taken' || code === 'page_slug_locked')
        setSlugError(t(code === 'page_slug_taken' ? 'pages.slug_taken' : 'pages.slug_locked'))
      setConflict(code === 'page_version_conflict')
      const retryable = cause instanceof ApiError && [0, 401, 503].includes(cause.status)
      setCanRetry(retryable)
      if (!retryable) pending.current = null
      return false
    } finally {
      busy.current = false
      setBusy(false)
    }
  }
  async function showPreview() {
    try {
      setPreview(await read())
      setError(null)
    } catch {
      setError(t('editor.error.invalid_document'))
    }
  }
  async function viewServer() {
    if (!saved) return
    try {
      setServerVersion(await getAdminPage(saved.id))
    } catch {
      setError(t('toast.failed'))
    }
  }
  return {
    saved,
    slug,
    title,
    setTitle,
    changeSlug,
    metadata_dirty,
    error,
    slug_error,
    is_conflict,
    server_version,
    setServerVersion,
    preview,
    setPreview,
    showPreview,
    viewServer,
    submit,
    is_pending: is_busy || mutation.isPending,
    can_retry,
    is_deleted,
  }
}
