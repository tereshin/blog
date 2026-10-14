import { randomUUID } from 'node:crypto'
import { and, desc, eq, gt, ne, sql } from 'drizzle-orm'
import type { Database } from '@blog/broker'
import { pages, page_mutations } from '../../infra/db/schema.ts'
import { detachPageFromNavItems } from '../nav-section/index.ts'
import { appendPageEvent } from './page.events.ts'
import { pageDto } from './page.mapper.ts'
import { decodeCursor, encodeCursor } from './page.cursor.ts'
import { pageError } from './page.errors.ts'
import type { AdminPagesQuery } from '@blog/contracts'
import type { PageRepositoryPort } from './page.types.ts'
const columns = {
  id: pages.id,
  title: pages.title,
  slug: pages.slug,
  status: pages.status,
  version: pages.version,
  created_by: pages.created_by,
  updated_by: pages.updated_by,
  created_at: pages.created_at,
  updated_at: pages.updated_at,
  published_at: pages.published_at,
  deleted_at: pages.deleted_at,
}

export class PageRepository implements PageRepositoryPort {
  constructor(private readonly db: Database) {}

    async list(query: AdminPagesQuery) {
      const cursor = decodeCursor(query)
      const rows = await this.db
        .select(columns)
        .from(pages)
        .where(
          and(
            ne(pages.status, 'deleted'),
            query.status ? eq(pages.status, query.status) : undefined,
            cursor
              ? sql`(${pages.created_at}, ${pages.id}) < (${new Date(cursor.created_at)}, ${cursor.id}::uuid)`
              : undefined,
          ),
        )
        .orderBy(desc(pages.created_at), desc(pages.id))
        .limit(query.limit + 1)
      const items = rows.slice(0, query.limit)
      const last = items.at(-1)
      return {
        rows: items,
        next_cursor:
          rows.length > query.limit && last
            ? encodeCursor(last.created_at, last.id, query.status)
            : null,
      }
    }

    async find(id: string) {
      const [row] = await this.db
        .select()
        .from(pages)
        .where(and(eq(pages.id, id), ne(pages.status, 'deleted')))
        .limit(1)
      return row ?? null
    }

    async publicPage(slug: string) {
      const [row] = await this.db
        .select()
        .from(pages)
        .where(and(eq(pages.slug, slug), eq(pages.status, 'published')))
        .limit(1)
      return row ?? null
    }

    published(cursor?: string, limit = 10_000) {
      return this.db
        .select()
        .from(pages)
        .where(and(eq(pages.status, 'published'), cursor ? gt(pages.id, cursor) : undefined))
        .orderBy(pages.id)
        .limit(limit)
    }

    async mutate(operation: Parameters<PageRepositoryPort['mutate']>[0], prepare: Parameters<PageRepositoryPort['mutate']>[1]) {
      try {
        return await this.db.transaction(async (tx) => {
          // Transaction-scoped lock deduplicates concurrent requests and survives process restarts.
          await tx.execute(
            sql`SELECT pg_advisory_xact_lock(hashtextextended(${operation.actor_id + ':' + operation.key}, 0))`,
          )
          const [previous] = await tx
            .select()
            .from(page_mutations)
            .where(
              and(
                eq(page_mutations.actor_id, operation.actor_id),
                eq(page_mutations.idempotency_key, operation.key),
              ),
            )
            .limit(1)
          if (previous) {
            if (previous.request_fingerprint !== operation.fingerprint)
              throw pageError('idempotency_key_conflict', 409)
            return { status: previous.response_status, page: previous.response_body }
          }
          const [current] = operation.id
            ? await tx.select().from(pages).where(eq(pages.id, operation.id)).for('update')
            : []
          if (operation.id && (!current || current.status === 'deleted'))
            throw pageError('page_not_found', 404)
          if (current && current.version !== operation.expected_version)
            throw pageError('page_version_conflict', 409, { current_version: current.version })
          const now = new Date()
          let row
          if (operation.is_delete && current) {
            ;[row] = await tx
              .update(pages)
              .set({
                status: 'deleted',
                deleted_at: now,
                updated_at: now,
                updated_by: operation.actor_id,
                version: current.version + 1,
              })
              .where(eq(pages.id, current.id))
              .returning()
            await detachPageFromNavItems(tx as Database, current.id, now)
          } else {
            const input = await prepare(current ?? null)
            if (current?.published_at && input.slug !== current.slug)
              throw pageError('page_slug_locked', 409)
            const fields = {
              ...input,
              updated_at: now,
              updated_by: operation.actor_id,
              published_at: current?.published_at ?? (input.status === 'published' ? now : null),
            }
            if (current) {
              ;[row] = await tx
                .update(pages)
                .set({ ...fields, version: current.version + 1 })
                .where(and(eq(pages.id, current.id), eq(pages.version, current.version)))
                .returning()
            } else {
              ;[row] = await tx
                .insert(pages)
                .values({ ...fields, id: randomUUID(), created_by: operation.actor_id })
                .returning()
            }
          }
          if (!row) throw pageError('page_version_conflict', 409)
          await appendPageEvent(tx, row, operation.correlation_id)
          const result = {
            status: operation.is_delete ? 204 : operation.id ? 200 : 201,
            page: operation.is_delete ? null : pageDto(row),
          }
          await tx
            .insert(page_mutations)
            .values({
              actor_id: operation.actor_id,
              idempotency_key: operation.key,
              request_fingerprint: operation.fingerprint,
              response_status: result.status,
              response_body: result.page,
            })
          return result
        })
      } catch (error) {
        // Drizzle wraps driver errors in cause.
        const cause = error instanceof Error && error.cause ? error.cause : error
        if (cause && typeof cause === 'object' && 'code' in cause && cause.code === '23505')
          throw pageError('page_slug_taken', 409)
        throw error
      }
    }
}
