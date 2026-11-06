import type { MediaSettings } from '@blog/contracts'
import { useT } from '@/shared/i18n'
import { Button, PageCard } from '@/shared/ui'
import { useMediaSettingsForm } from '../model/useMediaSettingsForm.ts'
import { CompressionFields } from './CompressionFields.tsx'
import { StorageFields } from './StorageFields.tsx'

export function MediaSettingsForm({ initial }: { initial: MediaSettings }) {
  const { t } = useT()
  const form = useMediaSettingsForm(initial)
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        if (!form.is_pending) form.save.mutate()
      }}
    >
      <PageCard>
        <PageCard.Header title={t('media.settings.title')} />
        <PageCard.Content>
          <fieldset disabled={form.is_pending} className="flex min-w-0 flex-col gap-8 border-0 p-0">
            <CompressionFields
              value={form.draft.compression}
              onChange={(compression) => form.setDraft({ ...form.draft, compression })}
            />
            <StorageFields
              value={form.draft}
              onChange={form.setDraft}
              access_key={form.access_key}
              secret_key={form.secret_key}
              onAccessKey={form.setAccessKey}
              onSecretKey={form.setSecretKey}
            />
          </fieldset>
          {form.error ? (
            <p role="alert" className="text-sm text-danger">
              {form.error}
            </p>
          ) : null}
          {form.save.isSuccess ? (
            <p role="status" className="text-sm text-muted">
              {t('media.settings.saved')}
            </p>
          ) : null}
          {form.test.isSuccess ? (
            <p role="status" className="text-sm text-muted">
              {t('media.settings.connection_ok')}
            </p>
          ) : null}
        </PageCard.Content>
        <PageCard.Footer>
          <div className="flex flex-wrap gap-3">
            <Button type="submit" variant="primary" isDisabled={form.is_pending}>
              {form.save.isPending ? t('profile.saving') : t('common.save')}
            </Button>
            <Button
              type="button"
              variant="secondary"
              isDisabled={form.is_pending}
              onPress={(event) => {
                if (
                  event.target instanceof HTMLElement &&
                  event.target.closest('form')?.reportValidity()
                )
                  form.test.mutate()
              }}
            >
              {form.test.isPending ? t('media.settings.testing') : t('media.settings.test')}
            </Button>
          </div>
        </PageCard.Footer>
      </PageCard>
    </form>
  )
}
