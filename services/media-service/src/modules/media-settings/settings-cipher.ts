import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'

export class SettingsCipher {
  private readonly key: Buffer

  constructor(secret: string) {
    this.key = createHash('sha256').update('blog:media-settings:v1:').update(secret).digest()
  }

  encrypt(value: string): string {
    const iv = randomBytes(12)
    const cipher = createCipheriv('aes-256-gcm', this.key, iv)
    const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()])
    return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString('base64')
  }

  decrypt(value: string): string {
    const bytes = Buffer.from(value, 'base64')
    const decipher = createDecipheriv('aes-256-gcm', this.key, bytes.subarray(0, 12))
    decipher.setAuthTag(bytes.subarray(12, 28))
    return Buffer.concat([decipher.update(bytes.subarray(28)), decipher.final()]).toString('utf8')
  }
}
