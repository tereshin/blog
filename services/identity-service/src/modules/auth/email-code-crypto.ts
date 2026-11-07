import { createCipheriv, createDecipheriv, createHmac, hkdfSync, randomBytes, randomInt, timingSafeEqual } from 'node:crypto'

/** Domain-separated keys: compromising a code hash does not reveal queued mail. */
export class EmailCodeCrypto {
  private readonly hash_key: Buffer
  private readonly encryption_key: Buffer

  constructor(secret: string) {
    this.hash_key = Buffer.from(hkdfSync('sha256', secret, 'blog-auth', 'code-hmac', 32))
    this.encryption_key = Buffer.from(hkdfSync('sha256', secret, 'blog-auth', 'mail-encryption', 32))
  }

  generate(): string {
    return randomInt(0, 1_000_000).toString().padStart(6, '0')
  }

  hash(flow_id: string, email: string, purpose: string, code: string): string {
    return createHmac('sha256', this.hash_key).update(JSON.stringify([flow_id, email, purpose, code])).digest('hex')
  }

  matches(flow: { id: string; email: string; purpose: string; code_hash: string }, code: string): boolean {
    const expected = Buffer.from(flow.code_hash, 'hex')
    const actual = Buffer.from(this.hash(flow.id, flow.email, flow.purpose, code), 'hex')
    return expected.length === actual.length && timingSafeEqual(expected, actual)
  }

  encrypt(message: { email: string; code: string; purpose: string }): string {
    const iv = randomBytes(12)
    const cipher = createCipheriv('aes-256-gcm', this.encryption_key, iv)
    const data = Buffer.concat([cipher.update(JSON.stringify(message), 'utf8'), cipher.final()])
    return Buffer.concat([iv, cipher.getAuthTag(), data]).toString('base64')
  }

  decrypt(value: string): { email: string; code: string; purpose: string } {
    const data = Buffer.from(value, 'base64')
    const decipher = createDecipheriv('aes-256-gcm', this.encryption_key, data.subarray(0, 12))
    decipher.setAuthTag(data.subarray(12, 28))
    return JSON.parse(Buffer.concat([decipher.update(data.subarray(28)), decipher.final()]).toString('utf8'))
  }
}
