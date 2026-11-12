import { z } from 'zod'
import { navIconSvgSchema, navSectionItemTargetSchema } from './nav-sections.ts'

export const commentsWidgetSchema = z.strictObject({
  limit: z.number().int().min(1).max(50).default(2),
  sort: z.enum(['date', 'reactions']).default('reactions'),
  direction: z.enum(['asc', 'desc']).default('desc'),
  period: z.enum(['all', 'day', 'week', 'month']).default('all'),
  article_id: z.uuid().nullable().default(null),
})
export const widgetCommentsQuerySchema = commentsWidgetSchema.extend({
  limit: z.coerce.number().int().min(1).max(50).default(2),
})
export const feedbackFieldSchema = z.strictObject({
  name: z.enum(['name', 'email', 'phone', 'message', 'attachments']),
  label: z.string().trim().min(1).max(80),
  is_visible: z.boolean(),
  is_required: z.boolean(),
})
export const DEFAULT_FEEDBACK_FIELDS = [
  { name: 'name', label: 'Name', is_visible: true, is_required: true },
  { name: 'email', label: 'Email', is_visible: true, is_required: true },
  { name: 'phone', label: 'Phone', is_visible: true, is_required: false },
  { name: 'message', label: 'Message', is_visible: true, is_required: true },
  { name: 'attachments', label: 'Attachments', is_visible: true, is_required: false },
] satisfies z.infer<typeof feedbackFieldSchema>[]
export const feedbackWidgetSchema = z.strictObject({
  recipient: z.email().max(254),
  fields: z
    .array(feedbackFieldSchema)
    .length(5)
    .refine((fields) => new Set(fields.map((f) => f.name)).size === 5, 'Duplicate field'),
})
export const buttonListWidgetSchema = z.strictObject({
  title: z.string().trim().min(1).max(80),
  is_expanded: z.boolean().default(true),
  items: z
    .array(
      z.strictObject({
        id: z.uuid(),
        title: z.string().trim().min(1).max(80),
        icon: navIconSvgSchema.nullable().default(null),
        target: navSectionItemTargetSchema,
      }),
    )
    .max(30),
})
export const adminWidgetSchema = z.discriminatedUnion('type', [
  z.strictObject({ id: z.uuid(), type: z.literal('adminComments'), data: commentsWidgetSchema }),
  z.strictObject({ id: z.uuid(), type: z.literal('adminFeedback'), data: feedbackWidgetSchema }),
  z.strictObject({ id: z.uuid(), type: z.literal('adminButtons'), data: buttonListWidgetSchema }),
])
export const publicWidgetSchema = z.discriminatedUnion('type', [
  adminWidgetSchema.options[0],
  z.strictObject({
    id: z.uuid(),
    type: z.literal('adminFeedback'),
    data: feedbackWidgetSchema.omit({ recipient: true }),
  }),
  z.strictObject({
    id: z.uuid(),
    type: z.literal('adminButtons'),
    data: z.strictObject({
      title: z.string(),
      is_expanded: z.boolean(),
      items: z.array(
        z.strictObject({
          id: z.uuid(),
          title: z.string(),
          icon: navIconSvgSchema.nullable(),
          href: z.string(),
          is_external: z.boolean(),
        }),
      ),
    }),
  }),
])
const sectionFields = { id: z.uuid(), title: z.string().trim().max(80), has_card: z.boolean() }
export const sidebarSectionSchema = z.strictObject({
  ...sectionFields,
  widgets: z.array(adminWidgetSchema).max(20),
})
export const sidebarSchema = z.strictObject({
  version: z.number().int().positive(),
  sections: z.array(sidebarSectionSchema).max(20),
})
export const publicSidebarSchema = z.strictObject({
  version: z.number().int().positive(),
  sections: z.array(z.strictObject({ ...sectionFields, widgets: z.array(publicWidgetSchema) })),
})
export const updateSidebarSchema = sidebarSchema
  .omit({ version: true })
  .extend({ expected_version: z.number().int().positive() })
  .refine((value) => {
    const ids = value.sections.flatMap((section) => [
      section.id,
      ...section.widgets.map((widget) => widget.id),
    ])
    return new Set(ids).size === ids.length
  }, 'Duplicate identifier')
export const feedbackSubmissionSchema = z.strictObject({
  widget_id: z.uuid(),
  page_id: z.uuid().optional(),
  values: z.partialRecord(z.enum(['name', 'email', 'phone', 'message']), z.string().max(10000)),
  attachment_ids: z.array(z.uuid()).max(5).default([]),
  upload_token: z.string().min(32).max(128),
  website: z.string().max(200).default(''),
})
export const feedbackAcceptedSchema = z.strictObject({ submission_id: z.uuid() })
export const feedbackUploadSchema = z.strictObject({
  id: z.uuid(),
  name: z.string(),
  size: z.number(),
  mime: z.string(),
})
export type AdminWidget = z.infer<typeof adminWidgetSchema>
export type PublicWidget = z.infer<typeof publicWidgetSchema>
export type Sidebar = z.infer<typeof sidebarSchema>
export type PublicSidebar = z.infer<typeof publicSidebarSchema>
export type CommentsWidget = z.infer<typeof commentsWidgetSchema>
export type FeedbackSubmission = z.infer<typeof feedbackSubmissionSchema>
