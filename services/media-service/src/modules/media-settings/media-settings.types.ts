import type { ImageCompression, S3Settings } from '@blog/contracts'
import type { ObjectStore } from '../media/index.ts'

export type StorageConfig = S3Settings & { access_key: string; secret_key: string }
export type SettingsRecord = { compression: ImageCompression; storage_id: string | null }
export type MediaSettingsRepositoryPort = {
  get: () => Promise<SettingsRecord | null>
  storage: (id: string) => Promise<string | null>
  publicUrls: () => Promise<string[]>
  save: (
    settings: SettingsRecord,
    config?: { id: string; public_url: string; encrypted_config: string },
  ) => Promise<void>
}
export type ConfiguredStore = ObjectStore & { check: () => Promise<void>; close: () => void }
export type StorageFactory = (config: StorageConfig) => ConfiguredStore
