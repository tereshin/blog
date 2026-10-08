import * as client from 'openid-client'
import { AuthProviderError } from './auth.errors.ts'
import type { GoogleClaims, GoogleClient } from './auth.types.ts'

export type GoogleClientConfig = {
  issuer_url: string
  client_id: string
  client_secret: string
  redirect_uri: string
}

/** Один клиент и для Google, и для mock-google: метаданные читаются с `GOOGLE_ISSUER_URL`. */
export function createGoogleClient(config: GoogleClientConfig): GoogleClient {
  const issuer = new URL(config.issuer_url)
  const discovery = client.discovery(
    issuer,
    config.client_id,
    config.client_secret,
    undefined,
    issuer.protocol === 'http:' ? { execute: [client.allowInsecureRequests] } : undefined,
  )

  return {
    async begin() {
      const configuration = await discovery
      const code_verifier = client.randomPKCECodeVerifier()
      const state = client.randomState()
      const nonce = client.randomNonce()
      const redirect_to = client.buildAuthorizationUrl(configuration, {
        redirect_uri: config.redirect_uri,
        scope: 'openid email profile',
        code_challenge: await client.calculatePKCECodeChallenge(code_verifier),
        code_challenge_method: 'S256',
        state,
        nonce,
      })
      return { redirect_to, state, nonce, code_verifier }
    },

    async exchange(input) {
      try {
        const configuration = await discovery
        const tokens = await client.authorizationCodeGrant(configuration, input.callback_url, {
          pkceCodeVerifier: input.code_verifier,
          expectedState: input.expected_state,
          expectedNonce: input.expected_nonce,
        })
        const claims = tokens.claims()
        if (!claims?.sub || typeof claims.email !== 'string') throw new AuthProviderError()
        const identity: GoogleClaims = {
          sub: claims.sub,
          email: claims.email,
          email_verified: claims.email_verified === true,
          name: typeof claims.name === 'string' ? claims.name : null,
        }
        return identity
      } catch (error) {
        if (error instanceof AuthProviderError) throw error
        throw new AuthProviderError(error)
      }
    },
  }
}
