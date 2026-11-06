import { z } from 'zod'
import { ServiceUnavailableError } from '@blog/http-kit'
import type { ServiceClient } from '@blog/http-kit'

const originsSchema = z.object({
  origins: z.array(
    z.url().refine((value) => {
      const url = new URL(value)
      return ['http:', 'https:'].includes(url.protocol) && url.origin === value
    }),
  ),
})

export class MediaOriginsClient {
  private previous: string[] = []

  constructor(private readonly media: ServiceClient) {}

  async load(viewer_jwt: string): Promise<string[]> {
    const response = await this.media.request({
      path: '/internal/media-settings/origins',
      service_context: viewer_jwt,
    })
    const parsed = originsSchema.safeParse(response.body)
    if (response.status !== 200 || !parsed.success) throw new ServiceUnavailableError('media')
    this.previous = parsed.data.origins
    return this.previous
  }

  cached(): string[] {
    return this.previous
  }
}
