import type { ProfileStatusIcon } from '@blog/contracts'
import type { ReactNode } from 'react'
import { useT } from '@/shared/i18n'
import { Button } from '@/shared/ui'

type SettingsStatusIconsProps = {
  icons: ProfileStatusIcon[]
  can_edit_media: boolean
  upload: (options: { label: string; onUploaded: (url: string) => void }) => ReactNode
  onChange: (update: (icons: ProfileStatusIcon[]) => ProfileStatusIcon[]) => void
}

export function SettingsStatusIcons({ icons, can_edit_media, upload, onChange }: SettingsStatusIconsProps) {
  const { t } = useT()
  return (
    <fieldset className="flex flex-col gap-3 border-0 p-0">
      <legend className="text-sm font-medium">{t('admin.settings.status_icons')}</legend>
      <p className="text-sm text-muted">{t('admin.settings.status_icons_hint')}</p>
      {icons.map((icon) => (
        <div key={icon.id} className="flex flex-wrap items-center gap-2">
          <img src={icon.image_url} alt="" width={32} height={32} className="size-8 object-contain" />
          <input
            required
            maxLength={50}
            value={icon.label}
            disabled={!can_edit_media}
            aria-label={t('admin.settings.status_label')}
            className="min-w-0 rounded-lg border border-separator bg-background px-3 py-2"
            onChange={(event) => {
              const label = event.target.value
              onChange((current) => current.map((item) => item.id === icon.id ? { ...item, label } : item))
            }}
          />
          {can_edit_media ? (
            <>
              {upload({
                label: t('admin.settings.status_replace'),
                onUploaded: (image_url) => onChange((current) => current.map((item) => item.id === icon.id ? { ...item, image_url } : item)),
              })}
              <Button type="button" variant="ghost" onPress={() => onChange((current) => current.filter((item) => item.id !== icon.id))}>
                {t('admin.settings.status_remove')}
              </Button>
            </>
          ) : null}
        </div>
      ))}
      {can_edit_media && icons.length < 100 ? upload({
        label: t('admin.settings.status_add'),
        onUploaded: (image_url) => onChange((current) => current.length < 100
          ? [...current, { id: crypto.randomUUID(), label: t('profile.status'), image_url }]
          : current),
      }) : null}
    </fieldset>
  )
}
