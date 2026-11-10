import { useEffect } from 'react'
import { useSettings } from '@/entities/settings'
import { appendGoogleFontStylesheet } from '@/shared/lib/web-font.ts'

export function SiteFont() {
  const { data } = useSettings()
  const family = data?.font_family ?? 'Inter'
  const stylesheet = data?.font_stylesheet_url
  useEffect(() => {
    const link = appendGoogleFontStylesheet(stylesheet)
    const root = document.documentElement
    root.style.setProperty(
      '--font-sans',
      family === 'Inter'
        ? '"Inter Variable", sans-serif'
        : `${JSON.stringify(family)}, "Inter Variable", sans-serif`,
    )
    return () => {
      link?.remove()
      root.style.removeProperty('--font-sans')
    }
  }, [family, stylesheet])
  return null
}
