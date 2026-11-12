import { createHash, randomUUID } from 'node:crypto'
import { and, eq, inArray, lt, sql } from 'drizzle-orm'
import type { Database } from '@blog/broker'
import { AppError } from '@blog/errors'
import { feedback_files } from '../../infra/db/schema.ts'
import { sniff } from '../media/index.ts'
const hash = (value: string) => createHash('sha256').update(value).digest('hex')
const invalid = () =>
  new AppError({
    code: 'invalid_attachments',
    http_status: 422,
    message: 'Invalid attachments or upload limit exceeded',
  })
const MAX_FILE = 10 * 1024 * 1024
export class FeedbackFilesRepository {
  constructor(private readonly db: Database) {}
  async upload(token: string, key: string, name: string, bytes: Buffer) {
    if (
      !/^[a-zA-Z0-9-]{32,128}$/.test(token) ||
      !key ||
      key.length > 128 ||
      !bytes.length ||
      bytes.length > MAX_FILE
    )
      throw invalid()
    const mime = await sniff(bytes, 'attachment')
    if (!mime) throw invalid()
    return this.db.transaction(async (tx) => {
      const token_hash = hash(token)
      await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${token_hash}, 0))`)
      const files = await tx
        .select()
        .from(feedback_files)
        .where(eq(feedback_files.token_hash, token_hash))
      const old = files.find((file) => file.key === key)
      if (old) {
        if (old.content !== bytes.toString('base64')) throw invalid()
        return { id: old.id, name: old.name, size: old.byte_size, mime: old.mime }
      }
      if (
        files.length >= 5 ||
        files.some((file) => file.submission_id) ||
        files.reduce((sum, file) => sum + file.byte_size, bytes.length) > 20 * 1024 * 1024
      )
        throw invalid()
      const id = randomUUID()
      const safe_name =
        Array.from(name, (char) =>
          char === '/' || char === '\\' || char.charCodeAt(0) < 32 ? '_' : char,
        )
          .join('')
          .slice(0, 150) || 'attachment'
      await tx.insert(feedback_files).values({
        id,
        token_hash,
        name: safe_name,
        mime,
        byte_size: bytes.length,
        content: bytes.toString('base64'),
        key,
        expires_at: new Date(Date.now() + 2 * 86400000),
      })
      return { id, name: safe_name, size: bytes.length, mime }
    })
  }
  async claim(token: string, submission_id: string, ids: string[]) {
    if (!ids.length) return
    return this.db.transaction(async (tx) => {
      const token_hash = hash(token)
      await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${token_hash}, 0))`)
      const files = await tx
        .select()
        .from(feedback_files)
        .where(and(eq(feedback_files.token_hash, token_hash), inArray(feedback_files.id, ids)))
        .for('update')
      if (
        new Set(ids).size !== ids.length ||
        files.length !== ids.length ||
        files.some(
          (file) =>
            file.expires_at < new Date() ||
            (file.submission_id && file.submission_id !== submission_id),
        )
      )
        throw invalid()
      await tx
        .update(feedback_files)
        .set({ submission_id })
        .where(and(eq(feedback_files.token_hash, token_hash), inArray(feedback_files.id, ids)))
    })
  }
  async read(token: string, submission_id: string) {
    return this.db
      .select({
        id: feedback_files.id,
        name: feedback_files.name,
        mime: feedback_files.mime,
        content: feedback_files.content,
      })
      .from(feedback_files)
      .where(
        and(
          eq(feedback_files.token_hash, hash(token)),
          eq(feedback_files.submission_id, submission_id),
        ),
      )
  }
  async remove(token: string, submission_id: string) {
    await this.db
      .delete(feedback_files)
      .where(
        and(
          eq(feedback_files.token_hash, hash(token)),
          eq(feedback_files.submission_id, submission_id),
        ),
      )
  }
  async cleanup() {
    await this.db.delete(feedback_files).where(lt(feedback_files.expires_at, new Date()))
  }
}
