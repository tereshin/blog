import { publicPageLinks } from '../../infra/db/public-page-links.ts'
import { and, eq, sql } from 'drizzle-orm'
import type { Database } from '@blog/broker'
import { sidebar_config, pages, widget_mutations, settings } from '../../infra/db/schema.ts'
import { sidebarSchema, type Sidebar } from '@blog/contracts'
import { AppError } from '@blog/errors'
export class WidgetRepository {
  constructor(readonly db: Database) {}
  publicLinks(ids: string[]) {
    return publicPageLinks(this.db, ids)
  }

  async get(): Promise<Sidebar> {
    const [row] = await this.db.select().from(sidebar_config).where(eq(sidebar_config.id, 1))
    if (!row) throw new Error('Sidebar migration has not run')
    return sidebarSchema.parse(row.config)
  }
  async isSidebarEnabled() {
    const [row] = await this.db
      .select({ shell: settings.shell })
      .from(settings)
      .where(eq(settings.id, 1))
      .limit(1)
    return row?.shell.popular_comments !== false
  }
  async page(id: string) {
    const [row] = await this.db
      .select({ id: pages.id, slug: pages.slug, blocks: pages.blocks })
      .from(pages)
      .where(and(eq(pages.id, id), eq(pages.status, 'published')))
      .limit(1)
    return row ?? null
  }
  async save(config: Sidebar, expected_version: number, actor: string, key: string) {
    return this.db.transaction(async (tx) => {
      await tx.execute(
        sql`SELECT pg_advisory_xact_lock(hashtextextended(${'sidebar:' + actor + ':' + key}, 0))`,
      )
      const fingerprint = JSON.stringify({ config, expected_version })
      const [old] = await tx
        .select()
        .from(widget_mutations)
        .where(and(eq(widget_mutations.actor_id, actor), eq(widget_mutations.key, key)))
      if (old) {
        if (old.fingerprint !== fingerprint)
          throw new AppError({
            code: 'idempotency_key_conflict',
            http_status: 409,
            message: 'Idempotency conflict',
          })
        return sidebarSchema.parse(old.response)
      }
      const result = await tx
        .update(sidebar_config)
        .set({ config, version: config.version })
        .where(and(eq(sidebar_config.id, 1), eq(sidebar_config.version, expected_version)))
        .returning({ id: sidebar_config.id })
      if (!result.length)
        throw new AppError({
          code: 'sidebar_version_conflict',
          http_status: 409,
          message: 'Sidebar has changed; reload before saving',
        })
      await tx
        .insert(widget_mutations)
        .values({ actor_id: actor, key, fingerprint, response: config })
      return config
    })
  }
}
