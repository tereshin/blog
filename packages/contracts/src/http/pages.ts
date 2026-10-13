import { z } from 'zod'
import { blocksDocumentSchema } from './blocks.ts'

export const PAGE_SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$/
export const pageStatusSchema = z.enum(['draft', 'published'])
const title = z.string().trim().min(1).max(150)
const slug = z.string().regex(PAGE_SLUG_PATTERN)

/** Bound nesting before the recursive list schema sees untrusted input. */
export const pageDocumentSchema = z
  .unknown()
  .superRefine((value, ctx) => {
    if (!value || typeof value !== 'object' || !('blocks' in value) || !Array.isArray(value.blocks))
      return
    if (value.blocks.length > 500) {
      ctx.addIssue({ code: 'custom', message: 'Maximum 500 blocks' })
      return
    }
    const pending: { value: unknown; depth: number; list_depth: number }[] = value.blocks.map(
      (block) => ({ value: block, depth: 0, list_depth: 0 }),
    )
    let visited = 0
    while (pending.length) {
      const current = pending.pop()
      if (!current) break
      if (++visited > 100_000 || current.depth > 64 || current.list_depth > 10) {
        ctx.addIssue({ code: 'custom', message: 'Document nesting limit' })
        return
      }
      const node = current.value
      if (Array.isArray(node)) {
        for (const child of node)
          pending.push({ value: child, depth: current.depth + 1, list_depth: current.list_depth })
      } else if (node && typeof node === 'object') {
        for (const [key, child] of Object.entries(node))
          pending.push({
            value: child,
            depth: current.depth + 1,
            list_depth: current.list_depth + (key === 'items' ? 1 : 0),
          })
      }
    }
  })
  .pipe(blocksDocumentSchema.refine((doc) => doc.blocks.length <= 500))

const fields = {
  id: z.uuid(),
  title,
  slug,
  blocks: pageDocumentSchema,
  version: z.number().int().positive(),
  updated_at: z.iso.datetime(),
  published_at: z.iso.datetime().nullable(),
}
export const adminPageSchema = z.strictObject({
  ...fields,
  status: pageStatusSchema,
  created_at: z.iso.datetime(),
  created_by: z.uuid(),
  updated_by: z.uuid(),
})
export const publicPageSchema = z.strictObject({ ...fields, published_at: z.iso.datetime() })
export const adminPageSummarySchema = adminPageSchema.omit({ blocks: true })
export const adminPagesSchema = z.strictObject({
  items: z.array(adminPageSummarySchema),
  next_cursor: z.string().nullable(),
})
export const createPageSchema = z.strictObject({
  title,
  slug,
  blocks: pageDocumentSchema.default({ blocks: [] }),
})
export const updatePageSchema = z
  .strictObject({
    expected_version: z.number().int().positive(),
    title: title.optional(),
    slug: slug.optional(),
    blocks: pageDocumentSchema.optional(),
    status: pageStatusSchema.optional(),
  })
  .refine(
    (body) => Object.keys(body).some((key) => key !== 'expected_version'),
    'At least one change required',
  )
export const deletePageSchema = z.strictObject({ expected_version: z.number().int().positive() })
export const adminPagesQuerySchema = z.strictObject({
  status: pageStatusSchema.optional(),
  cursor: z.string().max(1024).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})
export type AdminPage = z.infer<typeof adminPageSchema>
export type PublicPage = z.infer<typeof publicPageSchema>
export type AdminPageSummary = z.infer<typeof adminPageSummarySchema>
export type AdminPages = z.infer<typeof adminPagesSchema>
export type CreatePage = z.infer<typeof createPageSchema>
export type UpdatePage = z.infer<typeof updatePageSchema>
export type AdminPagesQuery = z.infer<typeof adminPagesQuerySchema>
