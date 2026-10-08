import formbody from '@fastify/formbody'
import Fastify from 'fastify'
import type { FastifyInstance } from 'fastify'
import type { Env } from './config/env.ts'
import { loadParticipants } from './participants.ts'
import { authorizeRoutes } from './routes/authorize.ts'
import { discoveryRoutes } from './routes/discovery.ts'
import { jwksRoutes } from './routes/jwks.ts'
import { tokenRoutes } from './routes/token.ts'
import { CodeStore } from './state/codes.ts'
import { createSigningKeys } from './state/keys.ts'

export async function buildApp(env: Env, options: { quiet?: boolean } = {}): Promise<FastifyInstance> {
  const app = Fastify({ logger: { level: options.quiet ? 'silent' : 'info', redact: ['req.headers.authorization'] } })
  await app.register(formbody)

  const keys = await createSigningKeys()
  const codes = new CodeStore()
  const participants = loadParticipants(env)

  discoveryRoutes(app, env)
  jwksRoutes(app, keys)
  authorizeRoutes(app, { env, participants, codes })
  tokenRoutes(app, { env, participants, codes, keys })
  return app
}
