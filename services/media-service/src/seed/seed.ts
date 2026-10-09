import { insertInBatches } from '@blog/db-kit'
import type { SeedContext } from '@blog/db-kit'
import type { Logger } from '@blog/logger'
import { buildDataset, generateFileBytes } from '@blog/seed-data'
import type { SeedProfileName } from '@blog/seed-data'
import type { SeedEnv } from '../config/env.ts'
import { files } from '../infra/db/schema.ts'
import type { SeedObjectStore } from './object-store.ts'

export type MediaSeedInput = SeedContext & {
  profile: SeedProfileName
  env: SeedEnv
  logger: Logger
  store: SeedObjectStore
}

/**
 * Кладёт байты `seed/*` в хранилище под фиксированными именами и пишет `files`
 * с теми же URL, что стоят в блоках статей и аватарах. Существующий объект пропускается.
 * События не публикует.
 */
export async function seedMedia(input: MediaSeedInput): Promise<void> {
  const { db, logger, store } = input
  const dataset = buildDataset(input.profile, input.anchor, {
    media_base_url: input.env.S3_PUBLIC_URL,
    superadmin_email: input.env.SUPERADMIN_EMAIL,
  })

  const rows = []
  for (const file of dataset.files) {
    const body = generateFileBytes(file.object_name)
    if (!(await store.exists(file.object_name))) {
      await store.put({ key: file.object_name, body, content_type: file.mime })
    }
    rows.push({
      id: file.id,
      uploader_id: file.uploader_id,
      kind: file.kind,
      mime: file.mime,
      byte_size: body.length,
      url: file.url,
      idempotency_key: file.object_name,
      created_at: input.anchor,
    })
  }
  await insertInBatches(db, files, rows, { label: 'files', logger })
}
