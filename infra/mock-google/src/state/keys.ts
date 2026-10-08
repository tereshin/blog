import { exportJWK, generateKeyPair } from 'jose'
import type { JWK } from 'jose'

export type SigningKeys = { kid: string; private_key: CryptoKey; public_jwk: JWK }

/** Пара ключей RS256 создаётся при старте контейнера и живёт в памяти. */
export async function createSigningKeys(): Promise<SigningKeys> {
  const { publicKey, privateKey } = await generateKeyPair('RS256', { extractable: true })
  const kid = `mock-google-${Date.now().toString(36)}`
  return { kid, private_key: privateKey, public_jwk: { ...(await exportJWK(publicKey)), kid, alg: 'RS256', use: 'sig' } }
}
