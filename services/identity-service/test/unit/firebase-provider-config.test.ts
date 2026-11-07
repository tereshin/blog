import { beforeEach, describe, expect, it, vi } from 'vitest'
const http = vi.hoisted(() => ({ request: vi.fn(), close: vi.fn(async () => {}) }))
vi.mock('@blog/http-kit', async (original) => ({
  ...await original<typeof import('@blog/http-kit')>(), createServiceClient: () => http,
}))
import { FirebaseProviderConfig } from '../../src/infra/http/firebase-provider-config.ts'

beforeEach(() => vi.resetAllMocks())
describe('Firebase production provider configuration', () => {
  it('reads password settings and paginated enabled SSO providers through authenticated Admin APIs', async () => {
    http.request.mockResolvedValueOnce({ status: 200, body: { signIn: { email: { enabled: true } } } })
      .mockResolvedValueOnce({ status: 200, body: {
        defaultSupportedIdpConfigs: [
          { name: 'projects/test/defaultSupportedIdpConfigs/google.com', enabled: true },
          { name: 'projects/test/defaultSupportedIdpConfigs/github.com', enabled: false },
        ], nextPageToken: 'next page',
      } })
      .mockResolvedValueOnce({ status: 200, body: {
        defaultSupportedIdpConfigs: [{ name: 'projects/test/defaultSupportedIdpConfigs/apple.com', enabled: true }],
      } })
    const client = new FirebaseProviderConfig('test', async () => 'test-access-token')
    expect(await client.listProviders()).toEqual([{ id: 'password' }, { id: 'google.com' }, { id: 'apple.com' }])
    expect(http.request).toHaveBeenNthCalledWith(1, {
      path: '/admin/v2/projects/test/config', headers: { authorization: 'Bearer test-access-token' },
    })
    expect(http.request.mock.calls[2]?.[0].path).toContain('pageToken=next+page')
    expect(http.request.mock.calls.every(([request]) => !request.path.includes('publicConfig') && !request.path.includes('?key='))).toBe(true)
    await client.close()
    expect(http.close).toHaveBeenCalledOnce()
  })

  it('does not enable password or SSO when disabled in the actual Firebase project', async () => {
    http.request.mockResolvedValueOnce({ status: 200, body: { signIn: { email: { enabled: false } } } })
      .mockResolvedValueOnce({ status: 200, body: {} })
    expect(await new FirebaseProviderConfig('test', async () => 'token').listProviders()).toEqual([])
  })

  it('returns an operational 503 on a forbidden Admin API without substituting emulator providers', async () => {
    http.request.mockResolvedValueOnce({ status: 403, body: { error: { message: 'not allowed' } } })
    await expect(new FirebaseProviderConfig('test', async () => 'token').listProviders())
      .rejects.toMatchObject({ code: 'service_unavailable', http_status: 503 })
  })

  it('does not propagate credential error messages that may contain secrets', async () => {
    const client = new FirebaseProviderConfig('test', async () => { throw new Error('credential private secret') })
    await expect(client.listProviders()).rejects.toMatchObject({ code: 'service_unavailable', cause: 'Error' })
    expect(http.request).not.toHaveBeenCalled()
  })
})
