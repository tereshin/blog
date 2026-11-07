import { FirebaseEmailExistsError } from '../../src/modules/auth/index.ts'
import type { FirebaseGateway, VerifiedToken } from '../../src/modules/auth/index.ts'

type FakeUser = { uid: string; email: string; password: string; email_verified: boolean }

export function fakeFirebase(): FirebaseGateway & { users: Map<string, FakeUser>; codes: Map<string, string>; sent_verification: string[] } {
  const users = new Map<string, FakeUser>()
  const codes = new Map<string, string>()
  const sent_verification: string[] = []
  let seq = 0
  const gateway: FirebaseGateway & { users: Map<string, FakeUser>; codes: Map<string, string>; sent_verification: string[] } = {
    users,
    codes,
    sent_verification,
    async findUidByEmail(email) {
      return [...users.values()].find((user) => user.email === email)?.uid ?? null
    },
    async createVerifiedUser(input) {
      const created = await gateway.createUser(input)
      const user = users.get(created.firebase_uid)
      if (!user) throw new Error('Missing created user')
      user.email_verified = true
      return created
    },
    async setVerifiedPassword(input) {
      const user = users.get(input.firebase_uid)
      if (!user) throw new Error('Missing user')
      user.password = input.password
      user.email_verified = true
    },
    async verifyIdToken(id_token) {
      const user = [...users.values()].find((row) => row.uid === id_token)
      if (!user) throw new Error('bad token')
      return { firebase_uid: user.uid, email: user.email, email_verified: user.email_verified, name: null, provider_id: 'google.com' }
    },
    async createUser(input) {
      if ([...users.values()].some((row) => row.email === input.email)) throw new FirebaseEmailExistsError()
      const firebase_uid = `uid-${++seq}`
      users.set(firebase_uid, { uid: firebase_uid, email: input.email, password: input.password, email_verified: false })
      return { firebase_uid }
    },
    async deleteUser(firebase_uid) {
      users.delete(firebase_uid)
    },
    async signInWithPassword(input) {
      const user = [...users.values()].find((row) => row.email === input.email && row.password === input.password)
      if (!user) return null
      const token: VerifiedToken = {
        firebase_uid: user.uid,
        email: user.email,
        email_verified: user.email_verified,
        name: null,
        provider_id: 'password',
      }
      return token
    },
    async sendEmailVerification(firebase_uid) {
      const user = users.get(firebase_uid)
      if (!user) return false
      codes.set(`verify-${user.email}`, firebase_uid)
      sent_verification.push(firebase_uid)
      return true
    },
    async confirmEmailVerification(oob_code) {
      const firebase_uid = codes.get(oob_code) ?? null
      if (!firebase_uid) return null
      const user = users.get(firebase_uid)
      if (user) user.email_verified = true
      return { firebase_uid }
    },
    async sendPasswordReset(email) {
      const user = [...users.values()].find((row) => row.email === email)
      if (user) codes.set(`reset-${email}`, user.uid)
    },
    async confirmPasswordReset(input) {
      const firebase_uid = [...codes.entries()].find(([code]) => code === input.oob_code)?.[1]
      if (!firebase_uid) return false
      const user = users.get(firebase_uid)
      if (!user) return false
      user.password = input.password
      return true
    },
    async listProviders() {
      return [{ id: 'password' }, { id: 'google.com' }, { id: 'github.com' }]
    },
    async close() {},
  }
  return gateway
}

