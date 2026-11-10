import { useEffect } from 'react'
import { findGoogleFont, GOOGLE_FONTS, googleFontStylesheet } from '@blog/contracts/fonts'
import { appendGoogleFontStylesheet } from '@/shared/lib/web-font.ts'
import { useT } from '@/shared/i18n'
import { ComboBox } from '@/shared/ui'

const FONT_OPTIONS = GOOGLE_FONTS.map((font) => ({ value: font.family, label: font.family }))
export function SettingsFontField({
  value,
  onChange,
}: {
  value: string
  onChange: (family: string) => void
}) {
  const { t } = useT()
  useEffect(() => {
    const link = appendGoogleFontStylesheet(googleFontStylesheet(value))
    return () => link?.remove()
  }, [value])
  const font = findGoogleFont(value)
  const family = value === 'Inter' ? '"Inter Variable"' : JSON.stringify(value)
  return (
    <div className="flex min-w-0 flex-col gap-3">
      <ComboBox
        label={t('admin.settings.font')}
        value={value}
        options={FONT_OPTIONS}
        onChange={onChange}
        hint={t('admin.settings.font_hint')}
      />
      {font && !font.cyrillic ? (
        <p className="text-sm text-muted">{t('admin.settings.font_cyrillic_fallback')}</p>
      ) : null}
      <p
        className="rounded-xl border border-border p-4 text-xl"
        style={{ fontFamily: `${family}, "Inter Variable", sans-serif` }}
      >
        {t('admin.settings.font_preview')}
      </p>
    </div>
  )
}
