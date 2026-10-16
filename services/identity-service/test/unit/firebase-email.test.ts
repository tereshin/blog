import { beforeEach, describe, expect, it, vi } from 'vitest'
const auth = vi.hoisted(() => ({ getUser: vi.fn(), updateUser: vi.fn() }))
vi.mock('firebase-admin/app', () => ({
  getApps: () => [{}],
  cert: vi.fn(),
  initializeApp: vi.fn(),
}))
vi.mock('firebase-admin/auth', () => ({ getAuth: () => auth }))
vi.mock('@blog/http-kit', () => ({ createServiceClient: () => ({ close: async () => {} }) }))
import { FirebaseClient } from '../../src/infra/http/firebase-client.ts'

const client = new FirebaseClient({
  project_id: 'test',
  server_api_key: 'test',
  client_email: 'test@example.test',
  private_key: 'test',
})
beforeEach(() => vi.resetAllMocks())
describe('Firebase: административное подтверждение почты', () => {
  it('сверяет адрес и обновляет emailVerified через Admin SDK', async () => {
    auth.getUser.mockResolvedValue({ email: 'Reader@Example.Test', emailVerified: false })
    expect(await client.verifyUserEmail('uid', 'reader@example.test')).toBe(true)
    expect(auth.updateUser).toHaveBeenCalledWith('uid', { emailVerified: true })
  })
  it('не подтверждает другой адрес', async () => {
    auth.getUser.mockResolvedValue({ email: 'other@example.test', emailVerified: false })
    expect(await client.verifyUserEmail('uid', 'reader@example.test')).toBe(false)
    expect(auth.updateUser).not.toHaveBeenCalled()
  })
  it('не повторяет запись уже подтверждённого адреса', async () => {
    auth.getUser.mockResolvedValue({ email: 'reader@example.test', emailVerified: true })
    expect(await client.verifyUserEmail('uid', 'reader@example.test')).toBe(true)
    expect(auth.updateUser).not.toHaveBeenCalled()
  })
})
