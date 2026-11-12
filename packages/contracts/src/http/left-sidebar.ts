import { z } from 'zod'
import {
  MAX_NAV_SECTIONS,
  MAX_NAV_SECTION_ITEMS,
  navIconSvgSchema,
  navSectionItemTargetSchema,
} from './nav-sections.ts'

export const sidebarLinkSchema = z.strictObject({
  id: z.uuid(),
  title: z.string().trim().min(1).max(80),
  icon: navIconSvgSchema.nullable(),
  target: z.union([
    navSectionItemTargetSchema,
    z.strictObject({ kind: z.literal('page'), page_id: z.null() }),
  ]),
})
export const leftSidebarSectionsSchema = z
  .array(
    z.strictObject({
      id: z.uuid(),
      title: z.string().trim().min(1).max(80),
      items: z.array(sidebarLinkSchema).max(MAX_NAV_SECTION_ITEMS),
    }),
  )
  .max(MAX_NAV_SECTIONS)
  .refine((sections) => {
    const ids = sections.flatMap((section) => [section.id, ...section.items.map((item) => item.id)])
    return new Set(ids).size === ids.length
  }, 'Duplicate identifier')
export const leftSidebarSchema = z.strictObject({
  version: z.number().int().positive(),
  sections: leftSidebarSectionsSchema,
})
export const updateLeftSidebarSchema = leftSidebarSchema.omit({ version: true }).extend({
  expected_version: z.number().int().positive(),
})
export type LeftSidebar = z.infer<typeof leftSidebarSchema>
export type SidebarLink = z.infer<typeof sidebarLinkSchema>
