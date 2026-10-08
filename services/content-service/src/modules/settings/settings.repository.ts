import { eq } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import { settings } from '../../infra/db/schema.ts'

export type SettingsRow = { name: string; logo_url: string | null; locale: 'ru' | 'en' | 'sr'; about: string }

export type SettingsRepository = { findPublic: () => Promise<SettingsRow | null> }

export function createSettingsRepository(db: NodePgDatabase): SettingsRepository {
  return {
    async findPublic() {
      const [row] = await db
        .select({ name: settings.name, logo_url: settings.logo_url, locale: settings.locale, about: settings.about })
        .from(settings)
        .where(eq(settings.id, 1))
        .limit(1)
      return row ?? null
    },
  }
}
