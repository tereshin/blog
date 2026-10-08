import { and, eq } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import { files } from '../../infra/db/schema.ts'
import type { MediaRepository, StoredFile } from './media.types.ts'

function toStored(row: typeof files.$inferSelect): StoredFile {
  return {
    id: row.id,
    url: row.url,
    kind: row.kind,
    mime: row.mime,
    byte_size: row.byte_size,
    uploader_id: row.uploader_id,
  }
}

export function createMediaRepository(db: NodePgDatabase): MediaRepository {
  return {
    async findByKey(uploader_id, idempotency_key) {
      const [row] = await db
        .select()
        .from(files)
        .where(and(eq(files.uploader_id, uploader_id), eq(files.idempotency_key, idempotency_key)))
        .limit(1)
      return row ? toStored(row) : null
    },
    async findByUrl(url) {
      const [row] = await db.select({ uploader_id: files.uploader_id, kind: files.kind }).from(files).where(eq(files.url, url)).limit(1)
      return row ?? null
    },
    async insert(file) {
      const inserted = await db
        .insert(files)
        .values(file)
        .onConflictDoNothing({ target: [files.uploader_id, files.idempotency_key] })
        .returning()
      const row = inserted[0]
      return row ? toStored(row) : null
    },
  }
}
