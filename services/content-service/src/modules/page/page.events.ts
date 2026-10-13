import { appendToOutbox, newEventId } from '@blog/broker'
import type { Database } from '@blog/broker'
import { PageDeletedV1, PageUpdatedV1 } from '@blog/contracts'
import type { StoredPage } from './page.types.ts'
export async function appendPageEvent(tx: Database, row: StoredPage, correlation_id: string) {
  const schema = row.status === 'deleted' ? PageDeletedV1 : PageUpdatedV1
  await appendToOutbox(
    tx,
    schema.parse({
      event_id: newEventId(),
      name: row.status === 'deleted' ? 'content.page.deleted' : 'content.page.updated',
      occurred_at: row.updated_at.toISOString(),
      correlation_id,
      causation_id: null,
      version: 1,
      page_id: row.id,
      slug: row.slug,
      status: row.status,
      page_version: row.version,
      actor_id: row.updated_by,
      updated_at: row.updated_at.toISOString(),
    }),
  )
}
