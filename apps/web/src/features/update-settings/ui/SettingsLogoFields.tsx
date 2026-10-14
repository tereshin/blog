import type { ReactNode } from 'react'
import { useT } from '@/shared/i18n'
import { Button } from '@/shared/ui'
export function SettingsLogoFields({
  value,
  onChange,
  upload,
  can_edit_media,
}: {
  value: { logo_url: string | null; logo_dark_url?: string | null }
  onChange: (patch: { logo_url?: string | null; logo_dark_url?: string | null }) => void
  upload: (options: { label: string; onUploaded: (url: string) => void }) => ReactNode
  can_edit_media: boolean
}) {
  const { t } = useT()
  return (
    <>
      {(['logo_url', 'logo_dark_url'] as const).map((field) => (
        <fieldset key={field} className="flex max-w-lg flex-col gap-4 border-0 p-0">
          <legend className="mb-3 text-base font-semibold">
            {t(field === 'logo_url' ? 'admin.settings.logo_light' : 'admin.settings.logo_dark')}
          </legend>
          <div className="flex flex-wrap items-center gap-4">
            {value[field] ? (
              <div
                data-theme={field === 'logo_url' ? 'light' : 'dark'}
                className="flex size-20 items-center justify-center rounded-xl border border-border bg-surface-secondary p-3"
              >
                <img loading="lazy"
                  src={value[field]}
                  alt={t('admin.settings.logo')}
                  className="max-h-full max-w-full object-contain"
                />
              </div>
            ) : null}
            {can_edit_media ? (
              upload({
                label: t(
                  value[field] ? 'admin.settings.replace_logo' : 'admin.settings.upload_logo',
                ),
                onUploaded: (url) => onChange({ [field]: url }),
              })
            ) : (
              <Button isDisabled>{t('admin.settings.upload_logo')}</Button>
            )}
            {value[field] ? (
              <Button
                type="button"
                variant="ghost"
                isDisabled={!can_edit_media}
                onPress={() => onChange({ [field]: null })}
              >
                {t('common.delete')}
              </Button>
            ) : null}
          </div>
        </fieldset>
      ))}
    </>
  )
}
