import { z } from 'zod'

/**
 * Поля статьи, которые content рассылает как владелец: по ним discussion держит копию, а gateway решает,
 * кому отдать живой кадр. Одинаковы во всех событиях `content.article.*`.
 */
export const articleSnapshotShape = {
  article_id: z.uuid(),
  author_id: z.uuid(),
  title: z.string().min(1),
  slug: z.string().min(1),
  visibility: z.enum(['public', 'members', 'author']),
  status: z.enum(['draft', 'published', 'hidden', 'deleted']),
  comments_enabled: z.boolean(),
  published_at: z.iso.datetime().nullable(),
}
