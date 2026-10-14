import { createHash } from 'node:crypto'
import { SERVICE_CONTEXT_HEADER } from '@blog/contracts'
import type { FaviconVariant } from '@blog/contracts'
import { NotFoundError } from '@blog/errors'
import { ServiceUnavailableError } from '@blog/http-kit'
import type { ServiceClient } from '@blog/http-kit'
import { SiteSettingsSchema } from './site-assets.schema.ts'
import type { AssetFile, AssetLocation, FileForwardPort } from './site-assets.types.ts'

export class SiteAssetsService {
  constructor(
    private readonly content: ServiceClient,
    private readonly files: FileForwardPort,
  ) {}

  /** Адрес файла из настроек сайта; не загружен — 404. */
  async locate(variant: FaviconVariant, service_context_jwt: string, correlation_id: string): Promise<AssetLocation> {
    const response = await this.content.request({
      path: '/v1/settings',
      service_context: service_context_jwt,
      correlation_id,
    })
    if (response.status !== 200) throw new ServiceUnavailableError('content')
    const parsed = SiteSettingsSchema.safeParse(response.body)
    if (!parsed.success) throw new ServiceUnavailableError('content')
    const url = parsed.data.favicon?.[variant]
    if (!url) throw new NotFoundError()
    return { url, etag: `"${createHash('sha256').update(url).digest('hex')}"` }
  }

  async open(url: string, service_context_jwt: string): Promise<AssetFile> {
    const file = await this.files.forward({
      entry: { prefix: '/internal/files/content', service: 'media' },
      method: 'GET',
      url: `/internal/files/content?url=${encodeURIComponent(url)}`,
      headers: { [SERVICE_CONTEXT_HEADER]: service_context_jwt },
      body: undefined,
      content_length: undefined,
    })
    if (file.status !== 200) {
      await file.body.dump()
      if (file.status === 404) throw new NotFoundError()
      throw new ServiceUnavailableError('media')
    }
    const mime = file.headers['content-type']
    return { mime: typeof mime === 'string' ? mime : 'application/octet-stream', body: file.body }
  }
}
