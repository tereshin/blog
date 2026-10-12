import { HttpResponse, http } from 'msw'
import { SITE_ASSETS } from '@blog/contracts'
import { readSite } from './shell.ts'
export const siteAssetHandlers = SITE_ASSETS.map((asset) =>
  http.get(`*${asset.path}`, async () => {
    const url = readSite().settings.favicon?.[asset.variant]
    if (!url) return new HttpResponse(null, { status: 404 })
    const response = await fetch(url)
    return new HttpResponse(await response.arrayBuffer(), {
      headers: {
        'Content-Type': response.headers.get('content-type') ?? 'application/octet-stream',
        'Cache-Control': 'no-cache',
      },
    })
  }),
)
