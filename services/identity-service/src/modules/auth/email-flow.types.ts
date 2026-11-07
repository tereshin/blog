import type { AuthRepositoryPort } from './auth.types.ts'

export type EmailFlow = {
  id: string
  email: string
  purpose: 'registration' | 'password_reset'
  user_id: string | null
  code_hash: string
  attempts: number
  expires_at: Date
  resend_at: Date
  verified_until: Date | null
  consumed_at: Date | null
  created_at: Date
}

export type EmailFlowStore = {
  auth: AuthRepositoryPort
  latest: () => Promise<EmailFlow | null>
  find: (flow_id: string) => Promise<EmailFlow | null>
  save: (flow: EmailFlow) => Promise<void>
  invalidate: (now: Date) => Promise<void>
  enqueue: (flow: EmailFlow, encrypted_message: string) => Promise<void>
  revokeSessions: (user_id: string, correlation_id: string, now: Date) => Promise<void>
}

export type EmailFlowRepositoryPort = {
  withEmail: <T>(email: string, work: (store: EmailFlowStore) => Promise<T>) => Promise<T>
  withFlow: <T>(flow_id: string, work: (flow: EmailFlow, store: EmailFlowStore) => Promise<T>) => Promise<T>
}
