import { createHash, timingSafeEqual } from 'node:crypto'
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { SignJWT } from 'jose'
import { z } from 'zod'
import type { Env } from '../config/env.ts'
import type { MockParticipant } from '../participants.ts'
import type { CodeStore } from '../state/codes.ts'
import type { SigningKeys } from '../state/keys.ts'

const tokenBody = z.object({
  grant_type: z.literal('authorization_code'),
  code: z.string(),
  redirect_uri: z.string(),
  code_verifier: z.string().min(43),
  client_id: z.string().optional(),
  client_secret: z.string().optional(),
})

const ID_TOKEN_TTL_SECONDS = 3600

type Deps = { env: Env; participants: readonly MockParticipant[]; codes: CodeStore; keys: SigningKeys }

function oauthError(reply: FastifyReply, status: number, error: string, description: string): FastifyReply {
  return reply.code(status).header('cache-control', 'no-store').send({ error, error_description: description })
}

function safeEqual(left: string, right: string): boolean {
  const a = Buffer.from(left)
  const b = Buffer.from(right)
  return a.length === b.length && timingSafeEqual(a, b)
}

function clientCredentials(request: FastifyRequest, body: z.infer<typeof tokenBody>): { id: string; secret: string } {
  const header = request.headers.authorization
  if (header?.startsWith('Basic ')) {
    const [id = '', ...rest] = Buffer.from(header.slice(6), 'base64').toString('utf8').split(':')
    return { id: decodeURIComponent(id), secret: decodeURIComponent(rest.join(':')) }
  }
  return { id: body.client_id ?? '', secret: body.client_secret ?? '' }
}

export function tokenRoutes(app: FastifyInstance, { env, participants, codes, keys }: Deps): void {
  const issuer = env.ISSUER_URL.replace(/\/$/, '')

  app.post('/token', async (request, reply) => {
    const parsed = tokenBody.safeParse(request.body)
    if (!parsed.success) return oauthError(reply, 400, 'invalid_request', 'нужны grant_type=authorization_code, code, redirect_uri, code_verifier')
    const body = parsed.data

    const credentials = clientCredentials(request, body)
    if (credentials.id !== env.CLIENT_ID || !safeEqual(credentials.secret, env.CLIENT_SECRET)) {
      return oauthError(reply, 401, 'invalid_client', 'неверные учётные данные клиента')
    }

    const entry = codes.take(body.code)
    if (!entry || entry.client_id !== credentials.id) return oauthError(reply, 400, 'invalid_grant', 'код неизвестен, просрочен или уже использован')
    if (entry.redirect_uri !== body.redirect_uri) return oauthError(reply, 400, 'invalid_grant', 'redirect_uri не совпадает с запросом авторизации')
    const challenge = createHash('sha256').update(body.code_verifier).digest('base64url')
    if (!safeEqual(challenge, entry.code_challenge)) return oauthError(reply, 400, 'invalid_grant', 'code_verifier не подходит к code_challenge')

    const participant = participants.find((item) => item.key === entry.participant_key)
    if (!participant) return oauthError(reply, 400, 'invalid_grant', 'участник не найден')

    const id_token = await new SignJWT({
      ...(entry.nonce ? { nonce: entry.nonce } : {}),
      email: participant.email,
      email_verified: true,
      name: participant.display_name,
      picture: participant.picture,
    })
      .setProtectedHeader({ alg: 'RS256', kid: keys.kid, typ: 'JWT' })
      .setIssuer(issuer)
      .setAudience(env.CLIENT_ID)
      .setSubject(participant.sub)
      .setIssuedAt()
      .setExpirationTime(`${ID_TOKEN_TTL_SECONDS}s`)
      .sign(keys.private_key)

    return reply.header('cache-control', 'no-store').send({
      access_token: `mock-access-${participant.key}`,
      token_type: 'Bearer',
      expires_in: ID_TOKEN_TTL_SECONDS,
      scope: 'openid email profile',
      id_token,
    })
  })
}
