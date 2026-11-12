import type { ThemeSettings } from '@blog/contracts'

/** Пишет токены вида на `<html>`; сброс — `clearThemeCssVars`. */
export function applyThemeCssVars(theme: ThemeSettings): void {
  const root = document.documentElement
  root.style.setProperty('--radius-card', theme.radius_card)
  // The middle of the slider follows the site theme, while both endpoints are absolute.
  const level = theme.header_overlay_lightness / 50
  const hue = theme.header_overlay_hue
  for (const [scheme, midpoint, surface] of [
    ['light', 94, 100],
    ['dark', 17, 10],
  ] as const) {
    const lightness = level <= 1 ? level * midpoint : midpoint + (level - 1) * (100 - midpoint)
    const opacity = theme.header_overlay_opacity / 100
    const is_light = lightness * opacity + surface * (1 - opacity) >= 55
    root.style.setProperty(`--header-tint-${scheme}`, `hsl(${hue} 48% ${lightness}%)`)
    root.style.setProperty(`--header-ink-${scheme}`, is_light ? '#17171b' : '#f8f8fb')
    root.style.setProperty(`--header-accent-${scheme}`, `hsl(${hue} 66% ${is_light ? 30 : 82}%)`)
  }
  root.style.setProperty('--header-overlay-opacity', `${theme.header_overlay_opacity}%`)
  root.style.setProperty('--header-overlay-blur', `${theme.header_overlay_blur_px}px`)
}

export function clearThemeCssVars(): void {
  const root = document.documentElement
  root.style.removeProperty('--radius-card')
  for (const scheme of ['light', 'dark']) {
    for (const token of ['tint', 'ink', 'accent'])
      root.style.removeProperty(`--header-${token}-${scheme}`)
  }
  root.style.removeProperty('--header-overlay-opacity')
  root.style.removeProperty('--header-overlay-blur')
}
