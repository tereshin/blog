import { randomBytes } from 'node:crypto'

export type PendingCode = {
  participant_key: string
  client_id: string
  redirect_uri: string
  nonce: string | null
  code_challenge: string
  expires_at: number
}

const CODE_TTL_MS = 60_000

/** Одноразовые коды авторизации: `take` забирает код и сразу удаляет. */
export class CodeStore {
  private readonly codes = new Map<string, PendingCode>()

  constructor(private readonly now: () => number = Date.now) {}

  issue(entry: Omit<PendingCode, 'expires_at'>): string {
    const code = randomBytes(24).toString('base64url')
    this.codes.set(code, { ...entry, expires_at: this.now() + CODE_TTL_MS })
    return code
  }

  take(code: string): PendingCode | null {
    const entry = this.codes.get(code)
    this.codes.delete(code)
    if (!entry || entry.expires_at < this.now()) return null
    return entry
  }
}
