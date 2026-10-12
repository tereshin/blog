import { useState } from 'react'
import { useT } from '@/shared/i18n'
import { BaseIcon, Button, Popover, Input, Textarea, Select } from '@/shared/ui'
import type { ArticleDraftForm } from '../model/usePublishArticle.ts'

type PublishSettingsProps = {
  form: ArticleDraftForm
  slug: string
  slug_error: string | null
  can_submit: boolean
  editor_ready: boolean
  is_preview: boolean
  onChange: (patch: Partial<ArticleDraftForm>) => void
  onSave: () => void
  onPreview: () => void
}
const FIELD_CLASS = 'w-full'

export function PublishSettings({
  form,
  slug,
  slug_error,
  can_submit,
  editor_ready,
  is_preview,
  onChange,
  onSave,
  onPreview,
}: PublishSettingsProps) {
  const { t } = useT()
  const [is_open, setOpen] = useState(false)
  return (
    <Popover isOpen={is_open} onOpenChange={setOpen}>
      <Button variant="ghost" isIconOnly aria-label={t('editor.settings')} className="text-muted">
        <BaseIcon name="settings_3" style="line" />
      </Button>
      <Popover.Content placement="top end" className="max-w-[calc(100vw-32px)]">
        <div className="flex max-h-[75vh] w-80 max-w-full flex-col gap-3 overflow-y-auto p-1">
          <Popover.Heading className="text-sm font-semibold">
            {t('editor.settings')}
          </Popover.Heading>
          <Button
            variant="secondary"
            isDisabled={!can_submit}
            onPress={() => {
              setOpen(false)
              onSave()
            }}
          >
            {t('editor.save_draft')}
          </Button>
          <Button
            variant="ghost"
            isDisabled={!editor_ready}
            onPress={() => {
              setOpen(false)
              onPreview()
            }}
          >
            {t(is_preview ? 'editor.resume' : 'editor.preview')}
          </Button>
          <Select
            size="base"
            variant="secondary"
            label={t('editor.visibility')}
            value={form.visibility}
            options={(['public', 'members', 'author'] as const).map((value) => ({
              value,
              label: t(`editor.visibility.${value}`),
            }))}
            onChange={(visibility) => {
              if (visibility === 'public' || visibility === 'members' || visibility === 'author')
                onChange({ visibility })
            }}
          />
          <label className="flex flex-col gap-1 text-sm">
            {t('editor.slug')}
            <Input
              size="base"
              variant="secondary"
              value={form.slug}
              placeholder={slug || 'moy-adres'}
              aria-invalid={slug_error ? true : undefined}
              onChange={(event) => onChange({ slug: event.target.value })}
              className={FIELD_CLASS}
            />
            <span className="text-xs text-muted">{t('editor.slug_hint')}</span>
            {slug_error ? <span className="text-sm text-danger">{slug_error}</span> : null}
          </label>
          <fieldset className="flex flex-col gap-2 border-t border-separator pt-3">
            <legend className="text-sm font-semibold">{t('seo.editor')}</legend>
            <p className="text-xs text-muted">{t('seo.editor_hint')}</p>
            <label className="flex flex-col gap-1 text-sm">
              {t('seo.title')}
              <Input
                size="base"
                variant="secondary"
                maxLength={200}
                value={form.seo_title ?? ''}
                placeholder={form.title}
                onChange={(event) => onChange({ seo_title: event.target.value })}
                className={FIELD_CLASS}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              {t('seo.description')}
              <Textarea
                size="base"
                variant="secondary"
                maxLength={500}
                value={form.seo_description ?? ''}
                onChange={(event) => onChange({ seo_description: event.target.value })}
                className={FIELD_CLASS}
              />
            </label>
          </fieldset>
        </div>
      </Popover.Content>
    </Popover>
  )
}
