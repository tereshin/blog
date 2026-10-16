import { describe, expect, it, vi } from 'vitest'
import type { ServiceContext } from '@blog/contracts'
import { UserEmailVerificationService } from '../../src/modules/user/user-email.service.ts'

const SUPER: ServiceContext = {
  user_id: 'root',
  role: 'superadmin',
  viewer_key: 'user:root',
  is_restricted: false,
  can_publish: true,
}
const account = () => ({
  email: 'reader@example.test',
  email_verified: false,
  firebase_uids: ['firebase-1', 'firebase-2'],
})
function setup() {
  const repository = { findAccount: vi.fn(async () => account()), confirm: vi.fn(async () => true) }
  const firebase = { verifyUserEmail: vi.fn(async () => true) }
  return { repository, firebase, service: new UserEmailVerificationService(repository, firebase) }
}

describe('подтверждение почты участника', () => {
  it.each(['guest', 'member', 'admin'] as const)(
    'запрещено для %s до обращения к поставщику',
    async (role) => {
      const { service, repository, firebase } = setup()
      const viewer = role === 'guest' ? { ...SUPER, user_id: undefined, role } : { ...SUPER, role }
      await expect(service.confirm(viewer, 'member')).rejects.toMatchObject({
        http_status: role === 'guest' ? 401 : 403,
      })
      expect(repository.findAccount).not.toHaveBeenCalled()
      expect(firebase.verifyUserEmail).not.toHaveBeenCalled()
    },
  )
  it('подтверждает связанные Firebase-аккаунты перед записью локального статуса', async () => {
    const { service, repository, firebase } = setup()
    firebase.verifyUserEmail.mockImplementation(async () => {
      expect(repository.confirm).not.toHaveBeenCalled()
      return true
    })
    await service.confirm(SUPER, 'member')
    expect(firebase.verifyUserEmail).toHaveBeenCalledWith('firebase-1', 'reader@example.test')
    expect(firebase.verifyUserEmail).toHaveBeenCalledWith('firebase-2', 'reader@example.test')
    expect(repository.confirm).toHaveBeenCalledWith('member', 'reader@example.test')
  })
  it('не меняет локальный статус при сбое Firebase', async () => {
    const { service, repository, firebase } = setup()
    firebase.verifyUserEmail.mockRejectedValue(new Error('provider unavailable'))
    await expect(service.confirm(SUPER, 'member')).rejects.toMatchObject({ http_status: 503 })
    expect(repository.confirm).not.toHaveBeenCalled()
  })
  it('не подтверждает почту, если адреса связанных аккаунтов отличаются', async () => {
    const { service, repository, firebase } = setup()
    firebase.verifyUserEmail.mockResolvedValue(false)
    await expect(service.confirm(SUPER, 'member')).rejects.toMatchObject({ http_status: 422 })
    expect(repository.confirm).not.toHaveBeenCalled()
  })
  it('не подтверждает аккаунт без почты', async () => {
    const { service, repository, firebase } = setup()
    repository.findAccount.mockResolvedValue({ ...account(), email: '' })
    await expect(service.confirm(SUPER, 'member')).rejects.toMatchObject({ http_status: 422 })
    expect(firebase.verifyUserEmail).not.toHaveBeenCalled()
  })
  it('не подтверждает аккаунт без Firebase identity', async () => {
    const { service, repository } = setup()
    repository.findAccount.mockResolvedValue({ ...account(), firebase_uids: [] })
    await expect(service.confirm(SUPER, 'member')).rejects.toMatchObject({ http_status: 422 })
    expect(repository.confirm).not.toHaveBeenCalled()
  })
  it('повтор подтверждённого аккаунта не вызывает поставщика', async () => {
    const { service, repository, firebase } = setup()
    repository.findAccount.mockResolvedValue({ ...account(), email_verified: true })
    await service.confirm(SUPER, 'member')
    expect(firebase.verifyUserEmail).not.toHaveBeenCalled()
    expect(repository.confirm).not.toHaveBeenCalled()
  })
  it('не сообщает об успехе при конкурентной смене почты или удалении', async () => {
    const { service, repository } = setup()
    repository.confirm.mockResolvedValue(false)
    await expect(service.confirm(SUPER, 'member')).rejects.toMatchObject({ http_status: 422 })
  })
})
