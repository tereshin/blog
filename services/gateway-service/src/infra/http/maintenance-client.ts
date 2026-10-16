import { maintenanceStatusSchema } from '@blog/contracts'
import { ServiceUnavailableError } from '@blog/http-kit'
import type { ServiceClient } from '@blog/http-kit'
import type { MaintenancePort } from '../../modules/maintenance/index.ts'

export class MaintenanceClient implements MaintenancePort {
  constructor(
    private readonly content: ServiceClient,
    private readonly web?: ServiceClient,
  ) {}

  async status(viewer_jwt: string) {
    const response = await this.content.request({
      path: '/internal/settings/maintenance',
      service_context: viewer_jwt,
    })
    const parsed = maintenanceStatusSchema.safeParse(response.body)
    if (response.status !== 200 || !parsed.success) throw new ServiceUnavailableError('content')
    return parsed.data
  }

  async template(): Promise<string | null> {
    if (!this.web) return null
    const response = await this.web.request({ path: '/index.html' })
    if (response.status !== 200 || typeof response.body !== 'string')
      throw new ServiceUnavailableError('web')
    return response.body
  }
}
