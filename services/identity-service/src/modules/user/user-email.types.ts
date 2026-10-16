export type UserEmailAccount = {
  email: string
  email_verified: boolean
  firebase_uids: string[]
}
export type UserEmailRepositoryPort = {
  findAccount: (id: string) => Promise<UserEmailAccount | null>
  confirm: (id: string, email: string) => Promise<boolean>
}
export type UserEmailVerifierPort = {
  verifyUserEmail: (firebase_uid: string, email: string) => Promise<boolean>
}
