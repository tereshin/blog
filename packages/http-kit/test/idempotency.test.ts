import Fastify from 'fastify'
import { describe, expect, it } from 'vitest'
import { errorHandler, idempotency, requestContext } from '../src/index.ts'
import { createLogger } from '@blog/logger'

const logger = createLogger({ service: 'http-kit-test', level: 'silent' })

async function appWithIdempotency(required = false) {
  const app = Fastify()
  await app.register(requestContext, { logger })
  await app.register(errorHandler)
  await app.register(idempotency, { required })
  app.post('/echo', async (request) => ({ key: request.idempotency_key }))
  app.get('/echo', async (request) => ({ key: request.idempotency_key }))
  return app
}

describe('idempotency', () => {
  it('кладёт ключ мутации в request', async () => {
    const app = await appWithIdempotency()
    const response = await app.inject({
      method: 'POST',
      url: '/echo',
      headers: { 'x-idempotency-key': 'once-1' },
    })
    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({ key: 'once-1' })
    await app.close()
  })

  it('на GET ключ не читает', async () => {
    const app = await appWithIdempotency()
    const response = await app.inject({
      method: 'GET',
      url: '/echo',
      headers: { 'x-idempotency-key': 'once-1' },
    })
    expect(response.json()).toEqual({ key: null })
    await app.close()
  })

  it('отклоняет пустой обязательный ключ и неверный формат', async () => {
    const required = await appWithIdempotency(true)
    expect((await required.inject({ method: 'POST', url: '/echo' })).statusCode).toBe(422)
    await required.close()

    const app = await appWithIdempotency()
    const bad = await app.inject({
      method: 'POST',
      url: '/echo',
      headers: { 'x-idempotency-key': 'has space' },
    })
    expect(bad.statusCode).toBe(422)
    await app.close()
  })
})
