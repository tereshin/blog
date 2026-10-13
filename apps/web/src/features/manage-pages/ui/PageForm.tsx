import type { EditorPanelSlots } from '@/shared/ui'
import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Link, useBlocker, useNavigate } from 'react-router'
import type { AdminPage } from '@/entities/page'
import { useViewer, memberMutationBlock } from '@/entities/session'
import { useT } from '@/shared/i18n'
import { Button, FormTextField } from '@/shared/ui'
import { PageDialogs } from './PageDialogs.tsx'
import { usePageForm } from '../model/usePageForm.ts'
import type { PageSnapshot } from '../model/usePageForm.ts'
type Props = {
  renderPanel: (slots: EditorPanelSlots) => ReactNode
  initial: AdminPage | null
  read: () => Promise<PageSnapshot>
  acknowledge: (snapshot: PageSnapshot) => Promise<boolean>
  is_dirty: boolean
  is_ready: boolean
  children: (title: string, onTitleChange: (value: string) => void) => ReactNode
}
export function PageForm({
  initial,
  read,
  acknowledge,
  is_dirty,
  is_ready,
  children,
  renderPanel,
}: Props) {
  const { t } = useT()
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
  return (
    <>
      {renderPanel({
        header: (
          <div className="flex flex-wrap items-center gap-3">
            <Link to="/admin/pages">{t('pages.title')}</Link>
            <span aria-live="polite" className="text-sm text-muted">
              {form.is_pending
                ? t('pages.saving')
                : dirty
                  ? t('pages.unsaved')
                  : form.saved
                    ? t('pages.saved')
                    : t('pages.new_draft')}
            </span>
            <span className="text-sm">
              {form.saved?.status === 'published' ? t('pages.published') : t('pages.draft')}
            </span>
          </div>
        ),
        metadata: (
          <>
            <FormTextField
              label={t('pages.slug')}
              value={form.slug}
              onChange={(event) => form.changeSlug(event.target.value)}
              {...(form.slug_error ? { error: form.slug_error } : {})}
              maxLength={40}
              readOnly={Boolean(form.saved?.published_at)}
              hint={form.saved?.published_at ? t('pages.slug_locked') : t('pages.slug_hint')}
            />
            <p className="break-all text-sm text-muted">{`/pages/${form.slug}`}</p>
            {form.saved?.status === 'published' ? (
              <p className="rounded-xl bg-surface-secondary p-3 text-sm">{t('pages.live_save')}</p>
            ) : null}
            {form.error ? (
              <p role="alert" className="text-danger">
                {form.error}
              </p>
            ) : null}
            {form.is_conflict ? (
              <Button variant="ghost" onPress={() => void form.viewServer()}>
                {t('pages.view_server')}
              </Button>
            ) : null}
            {form.can_retry && form.error ? (
              <Button isDisabled={mutation_disabled} onPress={() => void form.submit('save', true)}>
                {t('common.retry')}
              </Button>
            ) : null}
          </>
        ),
        children: children(form.title, form.setTitle),
        preview: form.preview
          ? { title: form.preview.title, blocks: form.preview.document.blocks }
          : null,
        footer: (
          <>
            <Button
              variant="primary"
              isDisabled={disabled}
              onPress={() => void form.submit('save')}
            >
              {form.saved?.status === 'published' ? t('pages.save_changes') : t('pages.save_draft')}
            </Button>
            {form.saved ? (
              <Button
                isDisabled={disabled}
                onPress={() =>
                  void form.submit(form.saved?.status === 'published' ? 'draft' : 'published')
                }
              >
                {form.saved.status === 'published' ? t('pages.unpublish') : t('pages.publish')}
              </Button>
            ) : null}
            <Button
              variant="ghost"
              isDisabled={!is_ready || form.is_pending}
              onPress={() => (form.preview ? form.setPreview(null) : void form.showPreview())}
            >
              {form.preview ? t('pages.back_editor') : t('editor.preview')}
            </Button>
            {form.saved?.status === 'published' ? (
              <Link to={`/pages/${form.saved.slug}`} target="_blank" rel="noopener noreferrer">
                {t('pages.open')}
              </Link>
            ) : null}
            {form.saved ? (
              <Button variant="ghost" isDisabled={disabled} onPress={() => setConfirmDelete(true)}>
                {t('common.delete')}
              </Button>
            ) : null}
          </>
        ),
      })}
      <PageDialogs
        form={form}
        confirm_delete={confirm_delete}
        onConfirmDelete={setConfirmDelete}
        onDelete={remove}
        is_blocked={blocker.state === 'blocked'}
        onStay={() => {
          if (blocker.state === 'blocked') blocker.reset()
        }}
        onLeave={() => {
          if (blocker.state === 'blocked') blocker.proceed()
        }}
        onReload={() => {
          skip_leave.current = true
          window.location.assign(`/admin/pages/${form.saved?.id}`)
        }}
        disabled={disabled}
      />
    </>
  )
}
