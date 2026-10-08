import type { FastifyInstance, FastifyReply } from 'fastify'
import { z } from 'zod'
import type { Env } from '../config/env.ts'
import type { MockParticipant } from '../participants.ts'
import type { CodeStore } from '../state/codes.ts'
import { renderPicker } from '../ui/pick-participant.ts'

const authorizeQuery = z.object({
  client_id: z.string(),
  redirect_uri: z.string(),
  response_type: z.literal('code').default('code'),
  state: z.string().default(''),
  nonce: z.string().default(''),
  code_challenge: z.string().min(43),
  code_challenge_method: z.literal('S256'),
})

const pickBody = authorizeQuery.extend({ participant: z.string() })

type Deps = { env: Env; participants: readonly MockParticipant[]; codes: CodeStore }

function badRequest(reply: FastifyReply, description: string): FastifyReply {
  return reply.code(400).send({ error: 'invalid_request', error_description: description })
}

export function authorizeRoutes(app: FastifyInstance, { env, participants, codes }: Deps): void {
  const matchesClient = (client_id: string, redirect_uri: string) => client_id === env.CLIENT_ID && redirect_uri === env.REDIRECT_URI

  app.get('/authorize', async (request, reply) => {
    const parsed = authorizeQuery.safeParse(request.query)
    if (!parsed.success) return badRequest(reply, 'нужны client_id, redirect_uri, code_challenge и code_challenge_method=S256')
    const query = parsed.data
    if (!matchesClient(query.client_id, query.redirect_uri)) return badRequest(reply, 'неизвестные client_id или redirect_uri')
    const hidden = {
      client_id: query.client_id,
      redirect_uri: query.redirect_uri,
      state: query.state,
      nonce: query.nonce,
      code_challenge: query.code_challenge,
      code_challenge_method: query.code_challenge_method,
    }
    return reply.type('text/html; charset=utf-8').send(renderPicker(participants, hidden))
  })

  app.post('/authorize', async (request, reply) => {
    const parsed = pickBody.safeParse(request.body)
    if (!parsed.success) return badRequest(reply, 'форма выбора неполна')
    const body = parsed.data
    if (!matchesClient(body.client_id, body.redirect_uri)) return badRequest(reply, 'неизвестные client_id или redirect_uri')
    const participant = participants.find((item) => item.key === body.participant)
    if (!participant) return badRequest(reply, 'неизвестный участник')

    const code = codes.issue({
      participant_key: participant.key,
      client_id: body.client_id,
      redirect_uri: body.redirect_uri,
      nonce: body.nonce || null,
      code_challenge: body.code_challenge,
    })
    const target = new URL(body.redirect_uri)
    target.searchParams.set('code', code)
    if (body.state) target.searchParams.set('state', body.state)
    return reply.redirect(target.toString(), 302)
  })
}
