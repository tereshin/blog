import { randomUUID } from 'node:crypto'
import {
  imageCompressionSchema,
  mediaSettingsSchema,
  s3SettingsSchema,
  updateMediaSettingsSchema,
} from '@blog/contracts'
import type { MediaSettings, ServiceContext, UpdateMediaSettings } from '@blog/contracts'
import { AppError, ForbiddenError, NotFoundError, ValidationError } from '@blog/errors'
import { z } from 'zod'
import type {
  MediaRepositoryPort,
  MediaRuntime,
  ObjectStore,
  UploadTarget,
} from '../media/index.ts'
import type {
  ConfiguredStore,
  MediaSettingsRepositoryPort,
  StorageConfig,
  StorageFactory,
} from './media-settings.types.ts'
import { SettingsCipher } from './settings-cipher.ts'

const storageConfigSchema = s3SettingsSchema.extend({
  access_key: z.string().min(1),
  secret_key: z.string().min(1),
})

export class MediaSettingsService implements MediaRuntime {
  private readonly stores = new Map<string, { store: ConfiguredStore; public_url: string }>()

  constructor(
    private readonly repository: MediaSettingsRepositoryPort,
    private readonly defaults: { config: StorageConfig; store: ObjectStore },
    private readonly cipher: SettingsCipher,
    private readonly factory: StorageFactory,
    private readonly files?: MediaRepositoryPort,
  ) {}

  assertAdmin(viewer: ServiceContext): void {
    if (!viewer.user_id || viewer.role !== 'superadmin' || viewer.is_restricted)
      throw new ForbiddenError()
  }

  private async config(id: string): Promise<StorageConfig> {
    const encrypted = await this.repository.storage(id)
    if (!encrypted) throw new NotFoundError()
    return storageConfigSchema.parse(JSON.parse(this.cipher.decrypt(encrypted)))
  }

  async get(viewer: ServiceContext): Promise<MediaSettings> {
    this.assertAdmin(viewer)
    const settings = await this.repository.get()
    const config = settings?.storage_id
      ? await this.config(settings.storage_id)
      : this.defaults.config
    return mediaSettingsSchema.parse({
      compression: settings?.compression ?? imageCompressionSchema.parse({}),
      storage: { ...s3SettingsSchema.strip().parse(config), has_credentials: true },
      use_custom_storage: Boolean(settings?.storage_id),
    })
  }

  private async resolveConfig(input: UpdateMediaSettings): Promise<StorageConfig> {
    if (!input.storage) return this.defaults.config
    const settings = await this.repository.get()
    const previous = settings?.storage_id ? await this.config(settings.storage_id) : null
    const access_key = input.storage.access_key ?? previous?.access_key
    const secret_key = input.storage.secret_key ?? previous?.secret_key
    if (!access_key || !secret_key)
      throw new ValidationError({ details: { field: 'storage.credentials' } })
    return { ...s3SettingsSchema.strip().parse(input.storage), access_key, secret_key }
  }

  async update(viewer: ServiceContext, body: unknown): Promise<MediaSettings> {
    this.assertAdmin(viewer)
    const input = updateMediaSettingsSchema.parse(body)
    const config = input.storage ? await this.resolveConfig(input) : null
    const previous = await this.repository.get()
    const previous_config = previous?.storage_id ? await this.config(previous.storage_id) : null
    const is_unchanged =
      config && previous_config && JSON.stringify(config) === JSON.stringify(previous_config)
    const storage_id = is_unchanged ? (previous?.storage_id ?? null) : config ? randomUUID() : null
    await this.repository.save(
      { compression: input.compression, storage_id },
      config && storage_id && !is_unchanged
        ? {
            id: storage_id,
            public_url: config.public_url,
            encrypted_config: this.cipher.encrypt(JSON.stringify(config)),
          }
        : undefined,
    )
    return this.get(viewer)
  }

  async test(viewer: ServiceContext, body: unknown): Promise<{ ok: true }> {
    this.assertAdmin(viewer)
    const input = updateMediaSettingsSchema.parse(body)
    const store = this.factory(await this.resolveConfig(input))
    try {
      await store.check()
      return { ok: true }
    } catch {
      // SDK errors can contain signed request details. Return only a stable, safe code.
      throw new AppError({
        code: 'storage_connection_failed',
        http_status: 422,
        message: 'Не удалось проверить запись, чтение и удаление в хранилище',
      })
    } finally {
      store.close()
    }
  }

  async forStorage(id: string | null): Promise<{ store: ObjectStore; public_url: string }> {
    if (!id) return { store: this.defaults.store, public_url: this.defaults.config.public_url }
    const cached = this.stores.get(id)
    if (cached) return cached
    const config = await this.config(id)
    // Another request may have populated this target while its configuration was loading.
    const existing = this.stores.get(id)
    if (existing) return existing
    const target = { store: this.factory(config), public_url: config.public_url }
    if (this.stores.size >= 16) {
      const oldest = this.stores.keys().next().value
      if (oldest) {
        this.stores.get(oldest)?.store.close()
        this.stores.delete(oldest)
      }
    }
    this.stores.set(id, target)
    return target
  }

  async current(): Promise<UploadTarget> {
    const settings = await this.repository.get()
    const storage_id = settings?.storage_id ?? null
    return {
      ...(await this.forStorage(storage_id)),
      storage_id,
      compression: settings?.compression ?? imageCompressionSchema.parse({}),
    }
  }

  async resolveUrl(url: string): Promise<{ store: ObjectStore; public_url: string }> {
    const file = await this.files?.findByUrl(url)
    return this.forStorage(file?.storage_id ?? null)
  }

  async publicOrigins(): Promise<string[]> {
    const urls = [this.defaults.config.public_url, ...(await this.repository.publicUrls())]
    return [...new Set(urls.map((url) => new URL(url).origin))]
  }

  close(): void {
    for (const { store } of this.stores.values()) store.close()
    this.stores.clear()
  }
}
