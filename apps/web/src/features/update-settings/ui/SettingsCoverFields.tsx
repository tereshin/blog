import type { ReactNode } from 'react'
import type { SocialCoverSettings } from '@blog/contracts'
import { useT } from '@/shared/i18n'
import { Button } from '@/shared/ui'

export function SettingsCoverFields({ value, onChange, upload, can_edit_media }: { value: SocialCoverSettings; onChange: (value: SocialCoverSettings) => void; upload: (options: { label: string; onUploaded: (url: string) => void }) => ReactNode; can_edit_media: boolean }) {
  const { t } = useT()
  return (
    <fieldset className="flex flex-col gap-3 border-t border-separator pt-4">
      <legend className="text-lg font-semibold">{t('seo.covers')}</legend>
      <p className="text-xs text-muted">{t('seo.covers_hint')}</p>
      <label className="flex flex-col gap-1 text-sm">
        {t('seo.background')}
        <select value={value.background_mode} onChange={(event) => onChange({ ...value, background_mode: event.target.value === 'color' ? 'color' : 'image' })} className="rounded-lg border border-separator bg-background px-3 py-2">
          <option value="image">{t('seo.background_image')}</option>
          <option value="color">{t('seo.background_color')}</option>
        </select>
      </label>
      <div className="flex flex-wrap gap-6">
        <label className="flex items-center gap-2 text-sm">{t('seo.fill_color')}<input type="color" value={value.background_color} onChange={(event) => onChange({ ...value, background_color: event.target.value })} /></label>
        <label className="flex items-center gap-2 text-sm">{t('seo.text_color')}<input type="color" value={value.text_color} onChange={(event) => onChange({ ...value, text_color: event.target.value })} /></label>
      </div>
      {can_edit_media ? upload({ label: t('seo.cover_logo'), onUploaded: (logo_url) => onChange({ ...value, logo_url }) }) : null}
      {value.logo_url ? <div className="flex items-center gap-3"><img src={value.logo_url} alt="" className="h-12 max-w-40 object-contain" /><Button type="button" variant="ghost" isDisabled={!can_edit_media} onPress={() => onChange({ ...value, logo_url: null })}>{t('seo.inherit_logo')}</Button></div> : null}
      {can_edit_media ? upload({ label: t('seo.default_cover'), onUploaded: (default_image_url) => onChange({ ...value, default_image_url }) }) : null}
      {value.default_image_url ? <div className="flex flex-col items-start gap-2"><img src={value.default_image_url} alt="" className="w-full max-w-80 rounded-lg" /><Button type="button" variant="ghost" isDisabled={!can_edit_media} onPress={() => onChange({ ...value, default_image_url: null })}>{t('seo.automatic_cover')}</Button></div> : null}
    </fieldset>
  )
}
