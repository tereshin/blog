import { and, eq } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import { files } from '../../infra/db/schema.ts'
import type { FoundFile, MediaRepositoryPort, StoredFile } from './media.types.ts'

const STORED_COLUMNS = {
  id: files.id,
  url: files.url,
  kind: files.kind,
  mime: files.mime,
  byte_size: files.byte_size,
  uploader_id: files.uploader_id,
}

export class MediaRepository implements MediaRepositoryPort {
  constructor(private readonly db: NodePgDatabase) {}

  async findByKey(uploader_id: string, idempotency_key: string): Promise<StoredFile | null> {
    const [row] = await this.db
      .select(STORED_COLUMNS)
      .from(files)
      .where(and(eq(files.uploader_id, uploader_id), eq(files.idempotency_key, idempotency_key)))
      .limit(1)
    return row ?? null
  }

  async findByUrl(url: string): Promise<FoundFile | null> {
    const [row] = await this.db
      .select({
        id: files.id,
        mime: files.mime,
        uploader_id: files.uploader_id,
        kind: files.kind,
      })
      .from(files)
      .where(eq(files.url, url))
      .limit(1)
    return row ?? null
  }

  async insert(file: StoredFile & { idempotency_key: string }): Promise<StoredFile | null> {
    const [row] = await this.db
      .insert(files)
      .values(file)
      .onConflictDoNothing({ target: [files.uploader_id, files.idempotency_key] })
      .returning(STORED_COLUMNS)
    return row ?? null
  }
}
