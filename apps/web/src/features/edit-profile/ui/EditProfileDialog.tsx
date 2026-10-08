import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { ApiError } from '@/shared/api'
import { useT } from '@/shared/i18n'
import type { MessageKey } from '@/shared/i18n'
import { Button, Dialog } from '@/shared/ui'
import { useUpdateProfile } from '../model/useUpdateProfile.ts'

export type ProfileDraft = {
  display_name: string
  bio: string
  avatar_url: string | null
  cover_url: string | null
  slug: string
  saved_slug: string
}

type EditProfileDialogProps = {
  is_open: boolean
  onOpenChange: (is_open: boolean) => void
  initial: ProfileDraft
  /** Слот загрузки: соседний feature не импортируется отсюда (границы слоёв). */
  upload: (field: 'avatar' | 'cover', onUploaded: (url: string) => void) => ReactNode
}

const FIELD_ERROR: Record<string, MessageKey> = {
  slug_taken: 'profile.error.slug_taken',
  slug_reserved: 'profile.error.slug_reserved',
  validation_failed: 'profile.error.invalid',
  slug_invalid: 'profile.error.invalid',
}

export function EditProfileDialog({ is_open, onOpenChange, initial, upload }: EditProfileDialogProps) {
  const { t } = useT()
  const update = useUpdateProfile()
  const [draft, setDraft] = useState(initial)
  const [field_error, setFieldError] = useState<string | null>(null)

  const snapshot = `${initial.display_name}\0${initial.slug}\0${initial.avatar_url ?? ''}`
  useEffect(() => {
    if (is_open) return
    setDraft(initial)
    setFieldError(null)
  }, [is_open, initial, snapshot])

  const save = () => {
    setFieldError(null)
    update.mutate(
      {
        display_name: draft.display_name,
        bio: draft.bio,
        avatar_url: draft.avatar_url,
        cover_url: draft.cover_url,
        slug: draft.slug.length > 0 ? draft.slug : null,
      },
      {
        onSuccess: () => onOpenChange(false),
        onError: (error) => {
          const code = error instanceof ApiError ? error.code : 'save'
          setFieldError(code)
        },
      },
    )
  }

  const slug_message = field_error && FIELD_ERROR[field_error] ? t(FIELD_ERROR[field_error]) : field_error ? t('profile.error.save') : null

  return (
    <Dialog is_open={is_open} onOpenChange={onOpenChange} size="md">
      <Dialog.CloseTrigger />
      <Dialog.Header>
        <Dialog.Heading>{t('profile.edit_title')}</Dialog.Heading>
      </Dialog.Header>
      <Dialog.Body>
        <form
          className="flex flex-col gap-3"
          onSubmit={(event) => {
            event.preventDefault()
            save()
          }}
        >
          <label className="flex flex-col gap-1 text-sm">
            {t('profile.display_name')}
            <input
              required
              minLength={1}
              maxLength={50}
              value={draft.display_name}
              onChange={(event) => setDraft({ ...draft, display_name: event.target.value })}
              className="rounded-lg border border-separator bg-background px-3 py-2"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            {t('profile.bio')}
            <textarea
              maxLength={500}
              value={draft.bio}
              onChange={(event) => setDraft({ ...draft, bio: event.target.value })}
              className="min-h-24 rounded-lg border border-separator bg-background px-3 py-2"
            />
          </label>
          {upload('avatar', (url) => setDraft((current) => ({ ...current, avatar_url: url })))}
          {upload('cover', (url) => setDraft((current) => ({ ...current, cover_url: url })))}
          <label className="flex flex-col gap-1 text-sm">
            {t('profile.slug')}
            <input
              value={draft.slug}
              maxLength={40}
              aria-invalid={slug_message ? true : undefined}
              onChange={(event) => setDraft({ ...draft, slug: event.target.value })}
              className="rounded-lg border border-separator bg-background px-3 py-2"
            />
            <span className="text-muted">{t('profile.slug_hint')}</span>
            {draft.saved_slug ? <span className="text-muted">{t('profile.slug_current', { slug: draft.saved_slug })}</span> : null}
            {slug_message ? <span className="text-danger">{slug_message}</span> : null}
          </label>
        </form>
      </Dialog.Body>
      <Dialog.Footer>
        <Button variant="primary" isDisabled={update.isPending || draft.display_name.trim().length === 0} onPress={save}>
          {update.isPending ? t('profile.saving') : t('profile.save')}
        </Button>
        <Button variant="ghost" slot="close">
          {t('common.close')}
        </Button>
      </Dialog.Footer>
    </Dialog>
  )
}
