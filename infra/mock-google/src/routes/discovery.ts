import type { FastifyInstance } from 'fastify'
import type { Env } from '../config/env.ts'

export function discoveryRoutes(app: FastifyInstance, env: Env): void {
  const issuer = env.ISSUER_URL.replace(/\/$/, '')
  app.get('/.well-known/openid-configuration', async () => ({
    issuer,
    authorization_endpoint: `${issuer}/authorize`,
    token_endpoint: `${issuer}/token`,
    jwks_uri: `${issuer}/jwks`,
    response_types_supported: ['code'],
    subject_types_supported: ['public'],
    id_token_signing_alg_values_supported: ['RS256'],
    scopes_supported: ['openid', 'email', 'profile'],
    token_endpoint_auth_methods_supported: ['client_secret_post', 'client_secret_basic'],
    code_challenge_methods_supported: ['S256'],
    claims_supported: ['iss', 'aud', 'sub', 'nonce', 'email', 'email_verified', 'name', 'picture', 'iat', 'exp'],
  }))
}
