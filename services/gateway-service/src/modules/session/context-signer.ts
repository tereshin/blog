import { createPrivateKey } from 'node:crypto'
import { SignJWT } from 'jose'
import type { CryptoKey, KeyObject } from 'jose'
import { contextToClaims, SERVICE_JWT_MAX_TTL_SECONDS } from '@blog/contracts'
import type { ServiceContext } from '@blog/contracts'
import { normalizePem, SERVICE_JWT_ALG } from '@blog/http-kit'

/** Подписывает служебный контекст (EdDSA), TTL ≤ 60 с. */
export class ContextSigner {
  private readonly key: KeyObject | CryptoKey

  constructor(
    private_key_pem: string,
    private readonly now: () => number = Date.now,
  ) {
    this.key = createPrivateKey(normalizePem(private_key_pem))
  }

  sign(context: ServiceContext): Promise<string> {
    const claims = contextToClaims(context, Math.floor(this.now() / 1000), SERVICE_JWT_MAX_TTL_SECONDS / 2)
    return new SignJWT({ ...claims }).setProtectedHeader({ alg: SERVICE_JWT_ALG }).sign(this.key)
  }
}
