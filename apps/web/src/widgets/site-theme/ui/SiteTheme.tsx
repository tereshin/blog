import { DEFAULT_THEME_SETTINGS } from '@blog/contracts'
import { useEffect } from 'react'
import { applyThemeCssVars, clearThemeCssVars, useSettings } from '@/entities/settings'

export function SiteTheme() {
  const { data } = useSettings()
  const theme = data?.theme ?? DEFAULT_THEME_SETTINGS
  const { radius_card, header_overlay_hue, header_overlay_opacity, header_overlay_blur_px } = theme
  useEffect(() => {
    applyThemeCssVars({
      radius_card,
      header_overlay_hue,
      header_overlay_opacity,
      header_overlay_blur_px,
    })
    return () => clearThemeCssVars()
  }, [radius_card, header_overlay_hue, header_overlay_opacity, header_overlay_blur_px])
  return null
}
