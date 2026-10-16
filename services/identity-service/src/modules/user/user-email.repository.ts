import { and, eq, isNull } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import { auth_identities, users } from '../../infra/db/schema.ts'
import type { UserEmailRepositoryPort } from './user-email.types.ts'

export class UserEmailRepository implements UserEmailRepositoryPort {
  constructor(private readonly db: NodePgDatabase) {}

  async findAccount(id: string) {
    const [account] = await this.db
      .select({ email: users.email, email_verified: users.email_verified })
      .from(users)
      .where(and(eq(users.id, id), isNull(users.deleted_at)))
      .limit(1)
    if (!account) return null
    const identities = await this.db
      .select({ firebase_uid: auth_identities.firebase_uid })
      .from(auth_identities)
      .where(eq(auth_identities.user_id, id))
    return { ...account, firebase_uids: identities.map((identity) => identity.firebase_uid) }
  }

  async confirm(id: string, email: string): Promise<boolean> {
    // A concurrent email change or deletion must not verify a different address.
    const rows = await this.db
      .update(users)
      .set({ email_verified: true })
      .where(and(eq(users.id, id), eq(users.email, email), isNull(users.deleted_at)))
      .returning({ id: users.id })
    return rows.length > 0
  }
}
