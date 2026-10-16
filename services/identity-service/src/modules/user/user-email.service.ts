import type { ServiceContext } from '@blog/contracts'
import { ForbiddenError, NotFoundError, UnauthorizedError, ValidationError } from '@blog/errors'
import { ServiceUnavailableError } from '@blog/http-kit'
import type { UserEmailRepositoryPort, UserEmailVerifierPort } from './user-email.types.ts'

export class UserEmailVerificationService {
  constructor(
    private readonly repository: UserEmailRepositoryPort,
    private readonly firebase: UserEmailVerifierPort,
  ) {}

  async confirm(viewer: ServiceContext, id: string): Promise<void> {
    if (!viewer.user_id) throw new UnauthorizedError()
    if (viewer.role !== 'superadmin') throw new ForbiddenError()
    const account = await this.repository.findAccount(id)
    if (!account) throw new NotFoundError()
    if (!account.email) throw new ValidationError({ message: 'У аккаунта не указана почта' })
    if (account.email_verified) return
    let has_matching_email = false
    try {
      for (const uid of account.firebase_uids) {
        if (await this.firebase.verifyUserEmail(uid, account.email)) has_matching_email = true
      }
    } catch (error) {
      throw new ServiceUnavailableError('firebase', error)
    }
    if (!has_matching_email)
      throw new ValidationError({ message: 'Адрес аккаунта не совпадает с почтой в Firebase' })
    if (!(await this.repository.confirm(id, account.email))) {
      throw new ValidationError({ message: 'Аккаунт изменён. Обновите список участников' })
    }
  }
}
