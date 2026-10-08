import { createHash, randomBytes } from 'node:crypto'
import { createServer } from 'node:net'
import type { AddressInfo } from 'node:net'
import type { FastifyInstance } from 'fastify'
import { decodeJwt } from 'jose'
import * as client from 'openid-client'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { buildApp } from '../src/app.ts'
import { loadEnv } from '../src/config/env.ts'

const REDIRECT_URI = 'http://localhost:3000/v1/auth/callback'
const CLIENT_ID = 'test-client'
const CLIENT_SECRET = 'test-secret'

async function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer()
    server.once('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address() as AddressInfo
      server.close(() => resolve(port))
    })
  })
}

let app: FastifyInstance
let issuer: string

beforeAll(async () => {
  const port = await freePort()
  issuer = `http://127.0.0.1:${port}`
  app = await buildApp(
    loadEnv({
      APP_ENV: 'local',
      HTTP_PORT: String(port),
      ISSUER_URL: issuer,
      CLIENT_ID,
      CLIENT_SECRET,
      REDIRECT_URI,
      SUPERADMIN_EMAIL: 'root@example.test',
    }),
    { quiet: true },
  )
  await app.listen({ host: '127.0.0.1', port })
})

afterAll(async () => {
  await app.close()
})

async function discover() {
  return client.discovery(new URL(issuer), CLIENT_ID, CLIENT_SECRET, undefined, { execute: [client.allowInsecureRequests] })
}

/** «Браузер»: открывает страницу выбора и нажимает на участника. */
async function pickParticipant(authorizeUrl: URL, participant: string): Promise<URL> {
  const page = await fetch(authorizeUrl)
  expect(page.status).toBe(200)
  const html = await page.text()
  expect(html).toContain(`data-participant="${participant}"`)

  const form = new URLSearchParams([...authorizeUrl.searchParams.entries(), ['participant', participant]])
  const picked = await fetch(`${issuer}/authorize`, { method: 'POST', body: form, redirect: 'manual' })
  expect(picked.status).toBe(302)
  return new URL(picked.headers.get('location') ?? '')
}

describe('mock-google: полный вход по PKCE', () => {
  it('отдаёт метаданные на одном хосте', async () => {
    const config = await discover()
    const metadata = config.serverMetadata()
    expect(metadata.issuer).toBe(issuer)
    for (const endpoint of [metadata.authorization_endpoint, metadata.token_endpoint, metadata.jwks_uri]) {
      expect(new URL(endpoint ?? '').origin).toBe(issuer)
    }
  })

  it('openid-client проходит вход и получает проверенный id_token с нужными клеймами', async () => {
    const config = await discover()
    const code_verifier = client.randomPKCECodeVerifier()
    const nonce = client.randomNonce()
    const state = client.randomState()
    const authorizeUrl = client.buildAuthorizationUrl(config, {
      redirect_uri: REDIRECT_URI,
      scope: 'openid email profile',
      code_challenge: await client.calculatePKCECodeChallenge(code_verifier),
      code_challenge_method: 'S256',
      nonce,
      state,
    })

    const callback = await pickParticipant(authorizeUrl, 'author_a')
    expect(`${callback.origin}${callback.pathname}`).toBe(REDIRECT_URI)
    expect(callback.searchParams.get('state')).toBe(state)

    const tokens = await client.authorizationCodeGrant(config, callback, {
      pkceCodeVerifier: code_verifier,
      expectedNonce: nonce,
      expectedState: state,
    })
    const claims = tokens.claims()
    expect(claims).toMatchObject({
      iss: issuer,
      aud: CLIENT_ID,
      sub: 'seed-sub-author_a',
      email: 'author-a@blog.test',
      email_verified: true,
      name: 'Анна Авторова',
      nonce,
    })
    expect(claims?.picture).toMatch(/avatar-author-a\.png$/)
    expect(decodeJwt(tokens.id_token ?? '')).toHaveProperty('exp')
  })

  it('суперадминистратор получает почту из SUPERADMIN_EMAIL', async () => {
    const config = await discover()
    const verifier = client.randomPKCECodeVerifier()
    const authorizeUrl = client.buildAuthorizationUrl(config, {
      redirect_uri: REDIRECT_URI,
      scope: 'openid email',
      code_challenge: await client.calculatePKCECodeChallenge(verifier),
      code_challenge_method: 'S256',
    })
    const callback = await pickParticipant(authorizeUrl, 'superadmin')
    const tokens = await client.authorizationCodeGrant(config, callback, { pkceCodeVerifier: verifier })
    expect(tokens.claims()?.email).toBe('root@example.test')
  })
})

describe('mock-google: отказы', () => {
  async function startFlow(participant = 'reader') {
    const verifier = randomBytes(32).toString('base64url')
    const params = new URLSearchParams({
      client_id: CLIENT_ID,
      redirect_uri: REDIRECT_URI,
      response_type: 'code',
      state: 's',
      nonce: 'n',
      code_challenge: createHash('sha256').update(verifier).digest('base64url'),
      code_challenge_method: 'S256',
    })
    const callback = await pickParticipant(new URL(`${issuer}/authorize?${params}`), participant)
    return { verifier, code: callback.searchParams.get('code') ?? '' }
  }

  function exchange(fields: Record<string, string>) {
    return fetch(`${issuer}/token`, {
      method: 'POST',
      body: new URLSearchParams({ grant_type: 'authorization_code', redirect_uri: REDIRECT_URI, client_id: CLIENT_ID, client_secret: CLIENT_SECRET, ...fields }),
    })
  }

  it('код одноразовый', async () => {
    const { code, verifier } = await startFlow()
    expect((await exchange({ code, code_verifier: verifier })).status).toBe(200)
    expect((await exchange({ code, code_verifier: verifier })).status).toBe(400)
  })

  it('чужой code_verifier отклоняется', async () => {
    const { code } = await startFlow()
    const response = await exchange({ code, code_verifier: randomBytes(32).toString('base64url') })
    expect(response.status).toBe(400)
    expect(await response.json()).toMatchObject({ error: 'invalid_grant' })
  })

  it('другой redirect_uri отклоняется и при выборе, и при обмене кода', async () => {
    const { code, verifier } = await startFlow()
    expect((await exchange({ code, code_verifier: verifier, redirect_uri: 'http://evil.test/cb' })).status).toBe(400)
    const page = await fetch(`${issuer}/authorize?${new URLSearchParams({ client_id: CLIENT_ID, redirect_uri: 'http://evil.test/cb', code_challenge: 'x'.repeat(43), code_challenge_method: 'S256' })}`)
    expect(page.status).toBe(400)
  })

  it('неверный секрет клиента отклоняется', async () => {
    const { code, verifier } = await startFlow()
    expect((await exchange({ code, code_verifier: verifier, client_secret: 'wrong' })).status).toBe(401)
  })

  it('метод challenge, кроме S256, не принимается', async () => {
    const response = await fetch(`${issuer}/authorize?${new URLSearchParams({ client_id: CLIENT_ID, redirect_uri: REDIRECT_URI, code_challenge: 'x'.repeat(43), code_challenge_method: 'plain' })}`)
    expect(response.status).toBe(400)
  })
})

describe('mock-google: окружение', () => {
  it('не запускается в prod', () => {
    expect(() =>
      loadEnv({ APP_ENV: 'prod', ISSUER_URL: issuer, CLIENT_ID, CLIENT_SECRET, REDIRECT_URI, SUPERADMIN_EMAIL: 'root@example.test' }),
    ).toThrow(/prod/)
  })
})
