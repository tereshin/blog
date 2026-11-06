import { eq } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import { media_settings, media_storage_configs } from '../../infra/db/schema.ts'
import type { MediaSettingsRepositoryPort, SettingsRecord } from './media-settings.types.ts'

export class MediaSettingsRepository implements MediaSettingsRepositoryPort {
  constructor(private readonly db: NodePgDatabase) {}

  async get(): Promise<SettingsRecord | null> {
    const [row] = await this.db
      .select({ compression: media_settings.compression, storage_id: media_settings.storage_id })
      .from(media_settings)
      .where(eq(media_settings.id, 1))
      .limit(1)
    return row ?? null
  }

  async storage(id: string): Promise<string | null> {
    const [row] = await this.db
      .select({ encrypted_config: media_storage_configs.encrypted_config })
      .from(media_storage_configs)
      .where(eq(media_storage_configs.id, id))
      .limit(1)
    return row?.encrypted_config ?? null
  }

  async publicUrls(): Promise<string[]> {
    const rows = await this.db
      .selectDistinct({ public_url: media_storage_configs.public_url })
      .from(media_storage_configs)
    return rows.map((row) => row.public_url)
  }

  async save(
    settings: SettingsRecord,
    config?: { id: string; public_url: string; encrypted_config: string },
  ): Promise<void> {
    await this.db.transaction(async (tx) => {
      if (config) await tx.insert(media_storage_configs).values(config)
      await tx
        .insert(media_settings)
        .values({ id: 1, ...settings })
        .onConflictDoUpdate({ target: media_settings.id, set: settings })
    })
  }
}
