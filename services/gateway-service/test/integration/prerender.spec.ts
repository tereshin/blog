import Fastify from 'fastify'
import type { FastifyInstance } from 'fastify'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { ServiceClient } from '@blog/http-kit'
import { errorHandler, requestContext } from '@blog/http-kit'
import { createLogger } from '@blog/logger'
import { prerenderRoutes } from '../../src/modules/prerender/index.ts'

const PUBLIC = {
  title: 'Публичная статья',
  description: 'Короткое описание',
  image_url: 'https://cdn.example/cover.png',
  type: 'article',
  text: 'Текст для робота',
}

const NEUTRAL = { title: 'Блог', description: '', image_url: null, type: 'website', text: '' }

function contentClient(): ServiceClient {
  return {
    async request({ path }) {
      if (path.includes('/article/public-post')) return { status: 200, headers: {}, body: PUBLIC }
      if (path.includes('/article/draft-post')) return { status: 200, headers: {}, body: NEUTRAL }
      return { status: 200, headers: {}, body: { ...NEUTRAL, description: 'О площадке' } }
    },
    async close() {},
  }
}

describe('gateway: ответ роботам', () => {
  let app: FastifyInstance

  beforeAll(async () => {
    app = Fastify()
    await app.register(requestContext, { logger: createLogger({ service: 'gateway-test', level: 'silent' }) })
    await app.register(errorHandler)
    await app.register(prerenderRoutes, { content: contentClient() })
  })

  afterAll(async () => {
    await app.close()
  })

  it('TelegramBot получает заголовок, описание и картинку публичной статьи', async () => {
    const response = await app.inject({ method: 'GET', url: '/p/public-post', headers: { 'user-agent': 'TelegramBot' } })
    expect(response.statusCode).toBe(200)
    expect(response.headers['content-type']).toContain('text/html')
    expect(response.body).toContain('Публичная статья')
    expect(response.body).toContain('Короткое описание')
    expect(response.body).toContain('https://cdn.example/cover.png')
    expect(response.body).toContain('Текст для робота')
  })

  it('черновик отдаёт нейтральный заголовок площадки без текста', async () => {
    const response = await app.inject({ method: 'GET', url: '/p/draft-post', headers: { 'user-agent': 'Telegrambot' } })
    expect(response.statusCode).toBe(200)
    expect(response.body).toContain('<title>Блог</title>')
    expect(response.body).not.toContain('<article>')
  })

  it('запрос без User-Agent робота получает 404', async () => {
    const response = await app.inject({ method: 'GET', url: '/p/public-post', headers: { 'user-agent': 'Mozilla/5.0' } })
    expect(response.statusCode).toBe(404)
    expect(response.headers['content-type']).toContain('application/problem+json')
  })
})
