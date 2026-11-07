import { z } from 'zod'
import { createServiceClient, ServiceUnavailableError } from '@blog/http-kit'

const projectConfigSchema = z.object({
  signIn: z.object({ email: z.object({ enabled: z.boolean().optional() }).optional() }).optional(),
})
const providerPageSchema = z.object({
  defaultSupportedIdpConfigs: z.array(z.object({ name: z.string(), enabled: z.boolean().optional() })).optional(),
  nextPageToken: z.string().optional(),
})

/** Provider configuration is an authenticated Admin API, not a public API-key endpoint. */
export class FirebaseProviderConfig {
  private readonly client = createServiceClient({ name: 'firebase-provider-config', base_url: 'https://identitytoolkit.googleapis.com' })

  constructor(private readonly project_id: string, private readonly getAccessToken: () => Promise<string>) {}

  async listProviders(): Promise<{ id: string }[]> {
    try {
      const headers = { authorization: `Bearer ${await this.getAccessToken()}` }
      const root = `/admin/v2/projects/${encodeURIComponent(this.project_id)}`
      const config_response = await this.client.request({ path: `${root}/config`, headers })
      if (config_response.status !== 200) throw new ServiceUnavailableError('firebase-config')
      const config = projectConfigSchema.parse(config_response.body)
      const providers = new Set<string>(config.signIn?.email?.enabled ? ['password'] : [])
      let page_token = ''
      const seen_tokens = new Set<string>()
      do {
        const query = new URLSearchParams({ pageSize: '100' })
        if (page_token) query.set('pageToken', page_token)
        const response = await this.client.request({ path: `${root}/defaultSupportedIdpConfigs?${query}`, headers })
        if (response.status !== 200) throw new ServiceUnavailableError('firebase-config')
        const page = providerPageSchema.parse(response.body)
        for (const provider of page.defaultSupportedIdpConfigs ?? []) {
          const id = provider.name.split('/').at(-1)
          if (provider.enabled && id) providers.add(id)
        }
        page_token = page.nextPageToken ?? ''
        if (page_token && seen_tokens.has(page_token)) throw new ServiceUnavailableError('firebase-config')
        seen_tokens.add(page_token)
      } while (page_token)
      return [...providers].map((id) => ({ id }))
    } catch (error) {
      // Provider errors can include credentials or email addresses; retain only the safe operation name.
      if (error instanceof ServiceUnavailableError) throw error
      throw new ServiceUnavailableError('firebase-config', error instanceof Error ? error.name : 'provider_error')
    }
  }

  close(): Promise<void> { return this.client.close() }
}
