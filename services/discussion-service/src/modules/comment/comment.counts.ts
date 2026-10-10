import { eq, sql } from 'drizzle-orm'
import type { Database } from '@blog/broker'
import { comments } from '../../infra/db/schema.ts'
export async function recountReplies(tx: Database, parent_id: string): Promise<void> {
  await tx
    .update(comments)
    .set({
      reply_count: sql<number>`(
        select count(*)::int from comments as child
        where child.parent_id = ${parent_id}::uuid
          and (child.status = 'visible' or child.reply_count > 0)
      )`,
    })
    .where(eq(comments.id, parent_id))
}
