import { and, eq, sql } from 'drizzle-orm'
import type { Database } from '@blog/broker'
import { idempotency_keys } from './schema.ts'

/** Транзакционная advisory-блокировка: снимается вместе с транзакцией. */
export async function advisoryLock(tx: Database, key: string): Promise<void> {
  await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${key}))`)
}

/** Сохранённый ответ на мутирующий запрос с тем же `X-Idempotency-Key`; формат проверяет вызывающий. */
export async function findIdempotentResponse(tx: Database, user_id: string, key: string): Promise<unknown> {
  const [stored] = await tx
    .select({ response: idempotency_keys.response })
    .from(idempotency_keys)
    .where(and(eq(idempotency_keys.user_id, user_id), eq(idempotency_keys.key, key)))
    .limit(1)
  return stored ? stored.response : null
}

export async function saveIdempotentResponse(tx: Database, user_id: string, key: string, response: unknown): Promise<void> {
  await tx.insert(idempotency_keys).values({ user_id, key, response })
}
