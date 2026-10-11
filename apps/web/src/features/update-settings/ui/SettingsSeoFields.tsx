import type { ReactNode } from 'react'
import type { SeoSettings } from '@blog/contracts'
import { useT } from '@/shared/i18n'
import { SettingsPublisherFields } from './SettingsPublisherFields.tsx'

type UploadSlot = (options: { label: string; onUploaded: (url: string) => void }) => ReactNode
export function SettingsSeoFields({ value, public_origin, onChange, upload, can_edit_media }: { value: SeoSettings; public_origin?: string; onChange: (value: SeoSettings) => void; upload: UploadSlot; can_edit_media: boolean }) {
  const { t } = useT()
  const field = 'rounded-lg border border-separator bg-background px-3 py-2'
  return (
    <>
      <fieldset className="flex flex-col gap-3 border-t border-separator pt-4">
        <legend className="text-lg font-semibold">{t('seo.settings')}</legend>
        <label className="flex flex-col gap-1 text-sm">
          {t('seo.public_origin')}
          <input readOnly value={public_origin ?? ''} className={field} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          {t('seo.title')}
          <input maxLength={200} value={value.title} onChange={(event) => onChange({ ...value, title: event.target.value })} className={field} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          {t('seo.description')}
          <textarea maxLength={500} value={value.description} onChange={(event) => onChange({ ...value, description: event.target.value })} className={field} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          {t('seo.template')}
          <input required maxLength={250} value={value.title_template} onChange={(event) => onChange({ ...value, title_template: event.target.value })} className={field} />
          <span className="text-xs text-muted">{t('seo.template_hint')}</span>
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={value.indexing_enabled} onChange={(event) => onChange({ ...value, indexing_enabled: event.target.checked })} />
          {t('seo.indexing')}
        </label>
        <p className="text-xs text-muted">{t('seo.indexing_hint')}</p>
        {(['home', 'popular', 'rating', 'about'] as const).map((key) => (
          <fieldset key={key} className="flex flex-col gap-2 rounded-lg border border-separator p-3">
            <legend className="text-sm font-medium">{t(`seo.page.${key}`)}</legend>
            <label className="flex flex-col gap-1 text-sm">
              {t('seo.title')}
              <input maxLength={200} value={value.pages[key].title} onChange={(event) => onChange({ ...value, pages: { ...value.pages, [key]: { ...value.pages[key], title: event.target.value } } })} className={field} />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              {t('seo.description')}
              <textarea maxLength={500} value={value.pages[key].description} onChange={(event) => onChange({ ...value, pages: { ...value.pages, [key]: { ...value.pages[key], description: event.target.value } } })} className={field} />
            </label>
          </fieldset>
        ))}
      </fieldset>
      <SettingsPublisherFields value={value.publisher} onChange={(publisher) => onChange({ ...value, publisher })} upload={upload} can_edit_media={can_edit_media} />
    </>
  )
}
