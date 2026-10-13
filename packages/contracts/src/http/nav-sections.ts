import { z } from 'zod'
import { isSafeNavIconSvg, NAV_ICON_SVG_MAX, normalizeNavIconSource } from './nav-icon-svg.ts'

export const MAX_NAV_SECTIONS = 20
export const MAX_NAV_SECTION_ITEMS = 30
export const NAV_SECTION_TITLE_MAX = 80
export { NAV_ICON_SVG_MAX } from './nav-icon-svg.ts'

const title = z.string().trim().min(1).max(NAV_SECTION_TITLE_MAX)
export const navIconSvgSchema = z
  .string()
  .trim()
  .min(1)
  .max(NAV_ICON_SVG_MAX)
  .transform(normalizeNavIconSource)
  .refine((value) => value.length <= NAV_ICON_SVG_MAX && isSafeNavIconSvg(value), 'svg icon')
const icon = navIconSvgSchema
const http_url = z
  .string()
  .trim()
  .max(2000)
  .refine((value) => {
    try {
      const url = new URL(value)
      return url.protocol === 'http:' || url.protocol === 'https:'
    } catch {
      return false
    }
  }, 'http(s) URL required')

function uniqueIds(max: number) {
  return z
    .array(z.uuid())
    .min(1)
    .max(max)
    .refine((ids) => new Set(ids).size === ids.length, 'duplicate ids')
}

export const navSectionItemTargetSchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('page'), page_id: z.uuid() }),
  z.strictObject({ kind: z.literal('url'), url: http_url }),
])
export type NavSectionItemTarget = z.infer<typeof navSectionItemTargetSchema>

const pageTargetSchema = z.strictObject({
  kind: z.literal('page'),
  page_id: z.uuid().nullable(),
  slug: z.string().nullable(),
  status: z.enum(['draft', 'published', 'deleted']).nullable(),
})

export const adminNavSectionItemSchema = z.strictObject({
  id: z.uuid(),
  title: z.string(),
  icon: icon.nullable(),
  position: z.number().int(),
  target: z.discriminatedUnion('kind', [
    pageTargetSchema,
    z.strictObject({ kind: z.literal('url'), url: z.string() }),
  ]),
})
export type AdminNavSectionItem = z.infer<typeof adminNavSectionItemSchema>

export const adminNavSectionSchema = z.strictObject({
  id: z.uuid(),
  title: z.string(),
  position: z.number().int(),
  items: z.array(adminNavSectionItemSchema),
})
export type AdminNavSection = z.infer<typeof adminNavSectionSchema>

export const adminNavSectionsSchema = z.strictObject({
  items: z.array(adminNavSectionSchema),
})
export type AdminNavSections = z.infer<typeof adminNavSectionsSchema>

export const publicNavSectionItemSchema = z.strictObject({
  id: z.uuid(),
  title: z.string(),
  icon: icon.nullable(),
  href: z.string(),
  is_external: z.boolean(),
})
export type PublicNavSectionItem = z.infer<typeof publicNavSectionItemSchema>

export const publicNavSectionSchema = z.strictObject({
  id: z.uuid(),
  title: z.string(),
  items: z.array(publicNavSectionItemSchema),
})
export type PublicNavSection = z.infer<typeof publicNavSectionSchema>

export const publicNavSectionsSchema = z.strictObject({
  items: z.array(publicNavSectionSchema),
})
export type PublicNavSections = z.infer<typeof publicNavSectionsSchema>

export const createNavSectionSchema = z.strictObject({ title })
export const updateNavSectionSchema = z.strictObject({ title })
export const createNavSectionItemSchema = z.strictObject({
  title,
  icon: icon.nullable().default(null),
  target: navSectionItemTargetSchema,
})
export const updateNavSectionItemSchema = createNavSectionItemSchema
export const navSectionOrderSchema = z.strictObject({
  section_ids: uniqueIds(MAX_NAV_SECTIONS),
})
export const navSectionItemOrderSchema = z.strictObject({
  item_ids: uniqueIds(MAX_NAV_SECTION_ITEMS),
})

export type CreateNavSection = z.infer<typeof createNavSectionSchema>
export type UpdateNavSection = z.infer<typeof updateNavSectionSchema>
export type CreateNavSectionItem = z.infer<typeof createNavSectionItemSchema>
export type UpdateNavSectionItem = z.infer<typeof updateNavSectionItemSchema>
export type NavSectionOrder = z.infer<typeof navSectionOrderSchema>
export type NavSectionItemOrder = z.infer<typeof navSectionItemOrderSchema>

/** Публичный сайдбар: черновик, удалённая и потерянная страница не попадают в список. */
export function toPublicNavSections(sections: readonly AdminNavSection[]): PublicNavSection[] {
  return sections.map((section) => ({
    id: section.id,
    title: section.title,
    items: section.items.flatMap((item): PublicNavSectionItem[] => {
      if (item.target.kind === 'url') {
        return [
          {
            id: item.id,
            title: item.title,
            icon: item.icon,
            href: item.target.url,
            is_external: true,
          },
        ]
      }
      if (item.target.status === 'published' && item.target.slug && item.target.page_id) {
        return [
          {
            id: item.id,
            title: item.title,
            icon: item.icon,
            href: `/pages/${item.target.slug}`,
            is_external: false,
          },
        ]
      }
      return []
    }),
  }))
}
