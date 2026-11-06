import type { Env } from './config/env.ts'
import type { DbHandle } from './infra/db/client.ts'
import { MediaRepository, MediaStorage } from './modules/media/index.ts'
import type { ObjectStore } from './modules/media/index.ts'
import {
  MediaSettingsRepository,
  MediaSettingsService,
  SettingsCipher,
} from './modules/media-settings/index.ts'

export function createMediaRuntime(
  env: Env,
  database: DbHandle,
  store: ObjectStore,
): MediaSettingsService {
  return new MediaSettingsService(
    new MediaSettingsRepository(database.db),
    {
      store,
      config: {
        endpoint: env.S3_ENDPOINT,
        region: env.S3_REGION,
        bucket: env.S3_BUCKET,
        public_url: env.S3_PUBLIC_URL,
        access_key: env.S3_ACCESS_KEY,
        secret_key: env.S3_SECRET_KEY,
        force_path_style: true,
      },
    },
    new SettingsCipher(env.MEDIA_SETTINGS_ENCRYPTION_KEY ?? env.S3_SECRET_KEY),
    (config) => new MediaStorage(config),
    new MediaRepository(database.db),
  )
}
