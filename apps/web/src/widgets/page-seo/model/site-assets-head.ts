import { SITE_ASSETS } from '@blog/contracts'
import type { FaviconSettings } from '@blog/contracts'
const MARKER = 'data-site-asset'
export function applySiteAssetsHead(favicon: FaviconSettings | undefined): void {
  for (const node of document.head.querySelectorAll(`[${MARKER}]`)) node.remove()
  for (const asset of SITE_ASSETS) {
    const url = favicon?.[asset.variant]
    if (!url) continue
    const link = document.createElement('link')
    link.rel = asset.rel
    link.href = `${asset.path}?v=${encodeURIComponent(url.split('/').at(-1) ?? url)}`
    if (asset.type) link.type = asset.type
    if (asset.sizes) link.setAttribute('sizes', asset.sizes)
    link.setAttribute(MARKER, asset.variant)
    document.head.append(link)
  }
}
