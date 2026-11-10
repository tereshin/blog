/** Only the Google CSS API is accepted; saved settings cannot inject arbitrary stylesheets. */
export function appendGoogleFontStylesheet(url: string | null | undefined): HTMLLinkElement | null {
  if (!url) return null
  const parsed = new URL(url)
  if (parsed.origin !== 'https://fonts.googleapis.com' || parsed.pathname !== '/css2') return null
  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = parsed.href
  document.head.append(link)
  return link
}
