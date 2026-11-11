import type { ThemeSettings } from '@blog/contracts'

/** Пишет токены вида на `<html>`; сброс — `clearThemeCssVars`. */
export function applyThemeCssVars(theme: ThemeSettings): void {
  const root = document.documentElement
  root.style.setProperty('--radius-card', theme.radius_card)
  root.style.setProperty('--header-overlay-hue', String(theme.header_overlay_hue))
  root.style.setProperty('--header-overlay-opacity', `${theme.header_overlay_opacity}%`)
  root.style.setProperty('--header-overlay-blur', `${theme.header_overlay_blur_px}px`)
}

export function clearThemeCssVars(): void {
  const root = document.documentElement
  root.style.removeProperty('--radius-card')
  root.style.removeProperty('--header-overlay-hue')
  root.style.removeProperty('--header-overlay-opacity')
  root.style.removeProperty('--header-overlay-blur')
}
