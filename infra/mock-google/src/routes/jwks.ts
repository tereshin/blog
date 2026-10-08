import type { FastifyInstance } from 'fastify'
import type { SigningKeys } from '../state/keys.ts'

export function jwksRoutes(app: FastifyInstance, keys: SigningKeys): void {
  app.get('/jwks', async () => ({ keys: [keys.public_jwk] }))
}
