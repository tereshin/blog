import type { ReactNode } from 'react'
import { faviconSettingsSchema, SITE_ASSETS } from '@blog/contracts'
import type { FaviconSettings, FaviconVariant } from '@blog/contracts'
import { useT } from '@/shared/i18n'
import { Button } from '@/shared/ui'
export function SettingsFaviconFields({
  value,
  onChange,
  upload,
  can_edit_media,
}: {
  value?: FaviconSettings
  onChange: (value: FaviconSettings) => void
  can_edit_media: boolean
  upload: (options: {
    label: string
    variant?: FaviconVariant
    onUploaded: (url: string) => void
  }) => ReactNode
}) {
  const { t } = useT()
  const icons = faviconSettingsSchema.parse(value ?? {})
  const keys = {
    png: 'admin.settings.favicon_png',
    svg: 'admin.settings.favicon_svg',
    ico: 'admin.settings.favicon_ico',
    apple: 'admin.settings.favicon_apple',
    manifest: 'admin.settings.favicon_manifest',
  } as const
  return (
    <fieldset className="flex min-w-0 flex-col gap-5 border-0 p-0">
      <legend className="mb-3 text-base font-semibold">{t('admin.settings.favicon')}</legend>
      {SITE_ASSETS.map(({ variant }) => (
        <div key={variant} className="flex min-w-0 flex-col gap-2">
          <p className="font-medium">{t(keys[variant])}</p>
          <div className="flex flex-wrap items-center gap-3">
            {icons[variant] && variant !== 'manifest' ? (
              <img
                src={icons[variant]}
                alt={t(keys[variant])}
                className="size-12 rounded-lg object-contain"
              />
            ) : null}
            {icons[variant] && variant === 'manifest' ? (
              <a
                href={icons[variant]}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-accent"
              >
                {t('admin.settings.favicon_manifest')}
              </a>
            ) : null}
            {can_edit_media ? (
              upload({
                label: t(keys[variant]),
                variant,
                onUploaded: (url) => onChange({ ...icons, [variant]: url }),
              })
            ) : (
              <Button isDisabled>{t(keys[variant])}</Button>
            )}
            {icons[variant] ? (
              <Button
                type="button"
                variant="ghost"
                isDisabled={!can_edit_media}
                aria-label={`${t('common.delete')}: ${t(keys[variant])}`}
                onPress={() => onChange({ ...icons, [variant]: null })}
              >
                {t('common.delete')}
              </Button>
            ) : null}
          </div>
        </div>
      ))}
    </fieldset>
  )
}
