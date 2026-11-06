import { randomUUID } from 'node:crypto'
import Fastify from 'fastify'
import { describe, expect, it, vi } from 'vitest'
import type { ServiceContext } from '@blog/contracts'
import { s3SettingsSchema } from '@blog/contracts'
import { errorHandler, requestContext } from '@blog/http-kit'
import { createLogger } from '@blog/logger'
import {
  MediaSettingsService,
  SettingsCipher,
  mediaSettingsRoutes,
} from '../../src/modules/media-settings/index.ts'
import type {
  MediaSettingsRepositoryPort,
  SettingsRecord,
  StorageConfig,
} from '../../src/modules/media-settings/media-settings.types.ts'

const ADMIN: ServiceContext = {
  user_id: randomUUID(),
  role: 'superadmin',
  is_restricted: false,
  can_publish: true,
  viewer_key: 'test',
}
const CONFIG: StorageConfig = {
  endpoint: 'https://account.r2.cloudflarestorage.com',
  bucket: 'images',
  region: 'auto',
  public_url: 'https://media.example.com',
  force_path_style: true,
  access_key: 'access-secret',
  secret_key: 'private-secret',
}
const compression = { enabled: true, format: 'webp' as const, quality: 82, max_dimension: 2560 }

function fixture() {
  let settings: SettingsRecord | null = null
  const configs = new Map<string, string>()
  const urls = new Set<string>()
  const repository: MediaSettingsRepositoryPort = {
    get: async () => settings,
    storage: async (id) => configs.get(id) ?? null,
    publicUrls: async () => [...urls],
    save: async (value, config) => {
      settings = value
      if (config) {
        configs.set(config.id, config.encrypted_config)
        urls.add(config.public_url)
      }
    },
  }
  const check = vi.fn(async () => {})
  const close = vi.fn()
  const cipher = new SettingsCipher('test-encryption-key')
  const factory = vi.fn(() => ({ put: async () => {}, check, close }))
  const create = () =>
    new MediaSettingsService(
      repository,
      {
        config: { ...CONFIG, public_url: 'https://old.example.com' },
        store: { put: async () => {} },
      },
      cipher,
      factory,
    )
  return { service: create(), create, configs, factory, check, close, cipher }
}

describe('media settings', () => {
  it('encrypts credentials, never returns them, and preserves them when omitted after a restart', async () => {
    const f = fixture()
    const saved = await f.service.update(ADMIN, { compression, storage: CONFIG })
    expect(JSON.stringify(saved)).not.toContain(CONFIG.access_key)
    expect(JSON.stringify(saved)).not.toContain(CONFIG.secret_key)
    expect([...f.configs.values()].join()).not.toContain(CONFIG.secret_key)
    expect(saved.storage).toMatchObject({ has_credentials: true, region: 'auto' })
    const restarted = f.create()
    await restarted.update(ADMIN, {
      compression: { ...compression, quality: 70 },
      storage: saved.storage && {
        endpoint: CONFIG.endpoint,
        region: CONFIG.region,
        bucket: CONFIG.bucket,
        public_url: CONFIG.public_url,
        force_path_style: true,
      },
    })
    await restarted.current()
    expect(f.factory).toHaveBeenLastCalledWith(CONFIG)
  })

  it('keeps prior storage available after switching and restores the server storage', async () => {
    const f = fixture()
    await f.service.update(ADMIN, { compression, storage: CONFIG })
    const first = await f.service.current()
    await f.service.update(ADMIN, {
      compression,
      storage: { ...CONFIG, public_url: 'https://new.example.com', bucket: 'other' },
    })
    expect((await f.service.forStorage(first.storage_id)).public_url).toBe(CONFIG.public_url)
    expect((await f.service.current()).public_url).toBe('https://new.example.com')
    await f.service.update(ADMIN, { compression, storage: null })
    expect((await f.service.get(ADMIN)).use_custom_storage).toBe(false)
    expect((await f.service.current()).public_url).toBe('https://old.example.com')
    expect(await f.service.publicOrigins()).toEqual(
      expect.arrayContaining([
        'https://old.example.com',
        'https://media.example.com',
        'https://new.example.com',
      ]),
    )
  })

  it('tests draft credentials without saving and sanitizes SDK failures', async () => {
    const f = fixture()
    expect(await f.service.test(ADMIN, { compression, storage: CONFIG })).toEqual({ ok: true })
    expect(f.configs.size).toBe(0)
    expect(f.close).toHaveBeenCalledOnce()
    f.check.mockRejectedValueOnce(new Error(CONFIG.secret_key))
    await expect(f.service.test(ADMIN, { compression, storage: CONFIG })).rejects.toMatchObject({
      code: 'storage_connection_failed',
      http_status: 422,
    })
    expect(f.close).toHaveBeenCalledTimes(2)
  })

  it('requires both credentials on first setup and rejects unsafe URLs and out-of-range quality', async () => {
    const f = fixture()
    const storage = s3SettingsSchema.strip().parse(CONFIG)
    await expect(f.service.update(ADMIN, { compression, storage })).rejects.toMatchObject({
      code: 'validation_failed',
    })
    for (const endpoint of [
      'file:///etc/passwd',
      'https://user:password@example.com',
      'https://example.com/?token=secret',
    ])
      await expect(
        f.service.update(ADMIN, { compression, storage: { ...CONFIG, endpoint } }),
      ).rejects.toThrow()
    await expect(
      f.service.update(ADMIN, { compression: { ...compression, quality: 101 }, storage: null }),
    ).rejects.toThrow()
    expect(f.configs.size).toBe(0)
  })

  it('rejects members and restricted administrators before parsing request bodies', async () => {
    const f = fixture()
    for (const viewer of [
      { ...ADMIN, role: 'member' as const },
      { ...ADMIN, is_restricted: true },
    ]) {
      await expect(f.service.get(viewer)).rejects.toMatchObject({ code: 'forbidden' })
      await expect(f.service.update(viewer, null)).rejects.toMatchObject({ code: 'forbidden' })
      await expect(f.service.test(viewer, null)).rejects.toMatchObject({ code: 'forbidden' })
    }
    expect(f.factory).not.toHaveBeenCalled()
  })

  it('authenticates JSON routes and returns no-store responses', async () => {
    const f = fixture()
    const app = Fastify()
    await app.register(requestContext, {
      logger: createLogger({ service: 'test', level: 'silent' }),
    })
    await app.register(errorHandler)
    app.addHook('onRequest', async (request) => {
      request.viewer = { ...ADMIN, role: request.headers['x-admin'] ? 'superadmin' : 'member' }
    })
    await app.register(mediaSettingsRoutes, { service: f.service })
    try {
      expect((await app.inject('/v1/media-settings')).statusCode).toBe(403)
      const response = await app.inject({
        method: 'PUT',
        url: '/v1/media-settings',
        headers: { 'x-admin': 'true' },
        payload: { compression, storage: CONFIG },
      })
      expect(response.statusCode).toBe(200)
      expect(response.headers['cache-control']).toBe('no-store')
      expect(response.body).not.toContain(CONFIG.secret_key)
      expect((await app.inject('/internal/media-settings/origins')).json()).toHaveProperty(
        'origins',
      )
    } finally {
      await app.close()
    }
  })

  it('detects encrypted configuration tampering and incorrect encryption keys', () => {
    const f = fixture()
    const encrypted = f.cipher.encrypt(JSON.stringify(CONFIG))
    expect(f.cipher.decrypt(encrypted)).toContain(CONFIG.secret_key)
    expect(() => new SettingsCipher('different-key').decrypt(encrypted)).toThrow()
    const bytes = Buffer.from(encrypted, 'base64')
    bytes[30] = (bytes[30] ?? 0) ^ 1
    expect(() => f.cipher.decrypt(bytes.toString('base64'))).toThrow()
  })
})
