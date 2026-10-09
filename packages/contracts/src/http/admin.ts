import { z } from 'zod'
import { feedCardSchema } from './feed.ts'
import { pageSchema } from './pagination.ts'
import { reportSchema } from './reports.ts'

export const updateUserRoleSchema = z.strictObject({
  role: z.enum(['member', 'admin']),
})
export type UpdateUserRole = z.infer<typeof updateUserRoleSchema>

export const updateUserPublishingSchema = z.strictObject({
  can_publish: z.boolean(),
})
export type UpdateUserPublishing = z.infer<typeof updateUserPublishingSchema>

/** Ограничение не принимает полей: действие целиком в адресе. */
export const restrictUserSchema = z.strictObject({})
export type RestrictUser = z.infer<typeof restrictUserSchema>

export const adminUserSchema = z.strictObject({
  id: z.uuid(),
  public_number: z.number().int().positive(),
  email: z.string(),
  role: z.enum(['member', 'admin', 'superadmin']),
  can_publish: z.boolean(),
  is_restricted: z.boolean(),
  created_at: z.iso.datetime(),
})
export type AdminUser = z.infer<typeof adminUserSchema>

export const adminUserPageSchema = pageSchema(adminUserSchema)
export type AdminUserPage = z.infer<typeof adminUserPageSchema>

export const moderationArticleSchema = z.strictObject({
  article: feedCardSchema.extend({
    status: z.enum(['draft', 'published', 'hidden', 'deleted']),
  }),
  reports: z.array(reportSchema),
})
export type ModerationArticle = z.infer<typeof moderationArticleSchema>

export const moderationPageSchema = pageSchema(moderationArticleSchema)
export type ModerationPage = z.infer<typeof moderationPageSchema>

export const reviewReportSchema = z.strictObject({
  status: z.literal('reviewed'),
})
export type ReviewReport = z.infer<typeof reviewReportSchema>
