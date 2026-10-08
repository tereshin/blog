import { z } from 'zod'

/**
 * Поля статьи, которые content рассылает как владелец: по ним discussion держит копию, а gateway решает,
 * кому отдать живой кадр. Одинаковы во всех событиях `content.article.*`.
 */
export const articleSnapshotShape = {
  article_id: z.uuid(),
  author_id: z.uuid(),
  topic_id: z.uuid(),
  title: z.string().min(1),
  slug: z.string().min(1),
  visibility: z.enum(['public', 'members', 'author']),
  status: z.enum(['draft', 'published', 'hidden', 'deleted']),
  comments_enabled: z.boolean(),
  excerpt: z.string(),
  first_image_url: z.string().nullable(),
  published_at: z.iso.datetime().nullable(),
}
