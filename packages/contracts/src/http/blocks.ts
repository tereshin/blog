import { z } from 'zod'
import { safeEmbedUrl } from './embed-url.ts'
import { navIconSvgSchema } from './nav-sections.ts'

/** Сервисы встраивания, для которых клиент подставляет свой iframe, а не HTML автора. */
export const EMBED_SERVICES = ['youtube', 'vimeo', 'twitter', 'github', 'codepen'] as const
export const embedServiceSchema = z.enum(EMBED_SERVICES)

/** Размеры и вариации кнопки HeroUI v3. */
export const BLOCK_BUTTON_SIZES = ['sm', 'md', 'lg'] as const
export const BLOCK_BUTTON_VARIANTS = [
  'primary',
  'secondary',
  'tertiary',
  'outline',
  'ghost',
  'danger',
  'danger-soft',
] as const
export const MAX_BLOCK_BUTTONS = 6
export const BLOCK_BUTTON_TEXT_MAX = 80
export const BLOCK_BUTTON_URL_MAX = 2000
export type BlockButtonSize = (typeof BLOCK_BUTTON_SIZES)[number]
export type BlockButtonVariant = (typeof BLOCK_BUTTON_VARIANTS)[number]

export function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return (url.protocol === 'http:' || url.protocol === 'https:') && !url.username && !url.password
  } catch {
    return false
  }
}

export const blockButtonSchema = z.object({
  text: z.string().trim().min(1).max(BLOCK_BUTTON_TEXT_MAX),
  url: z.string().trim().max(BLOCK_BUTTON_URL_MAX).refine(isHttpUrl, 'http url'),
  size: z.enum(BLOCK_BUTTON_SIZES),
  variant: z.enum(BLOCK_BUTTON_VARIANTS),
  icon: navIconSvgSchema.optional(),
})
export type BlockButton = z.infer<typeof blockButtonSchema>

export type ListItem =
  string | { content: string; items?: ListItem[]; meta?: { checked?: boolean } }

export const listItemSchema: z.ZodType<ListItem> = z.lazy(() =>
  z.union([
    z.string(),
    z.object({
      content: z.string(),
      items: z.array(listItemSchema).optional(),
      meta: z.object({ checked: z.boolean().optional() }).optional(),
    }),
  ]),
)

const blockId = { id: z.string().optional() }

/** Блок документа Editor.js. Неизвестный `type` не проходит схему — запись такого документа отклоняется целиком. */
export const editorBlockSchema = z.discriminatedUnion('type', [
  z.object({ ...blockId, type: z.literal('paragraph'), data: z.object({ text: z.string() }) }),
  z.object({
    ...blockId,
    type: z.literal('header'),
    data: z.object({
      text: z.string(),
      level: z.union([z.literal(2), z.literal(3), z.literal(4)]),
    }),
  }),
  z.object({
    ...blockId,
    type: z.literal('list'),
    data: z.object({
      style: z.enum(['unordered', 'ordered', 'checklist']),
      items: z.array(listItemSchema),
    }),
  }),
  z.object({
    ...blockId,
    type: z.literal('quote'),
    data: z.object({ text: z.string(), caption: z.string().optional() }),
  }),
  z.object({
    ...blockId,
    type: z.literal('warning'),
    data: z.object({ title: z.string(), message: z.string() }),
  }),
  z.object({ ...blockId, type: z.literal('delimiter'), data: z.object({}).optional() }),
  z.object({ ...blockId, type: z.literal('code'), data: z.object({ code: z.string() }) }),
  z.object({
    ...blockId,
    type: z.literal('image'),
    data: z.object({ file: z.object({ url: z.string() }), caption: z.string().optional() }),
  }),
  z.object({
    ...blockId,
    type: z.literal('embed'),
    data: z
      .object({
        service: embedServiceSchema,
        source: z.string(),
        embed: z.string(),
        width: z.number().optional(),
        height: z.number().optional(),
      })
      .refine((data) => safeEmbedUrl(data.service, data.embed) !== null, 'Invalid embed origin'),
  }),
  z.object({
    ...blockId,
    type: z.literal('table'),
    data: z
      .object({
        content: z.array(z.array(z.string())),
        with_headings: z.boolean().optional(),
        withHeadings: z.boolean().optional(),
      })
      .transform(({ content, with_headings, withHeadings }) => ({
        content,
        with_headings: with_headings ?? withHeadings,
      })),
  }),
  z.object({
    ...blockId,
    type: z.literal('attaches'),
    data: z.object({
      file: z.object({
        url: z.string(),
        size: z.number().optional(),
        extension: z.string().optional(),
      }),
      title: z.string(),
      size: z.number().optional(),
      extension: z.string().optional(),
    }),
  }),
  z.object({
    ...blockId,
    type: z.literal('personality'),
    data: z.object({
      name: z.string(),
      position: z.string().optional(),
      photo: z.string().optional(),
    }),
  }),
  z.object({
    ...blockId,
    type: z.literal('buttons'),
    data: z.object({ items: z.array(blockButtonSchema).min(1).max(MAX_BLOCK_BUTTONS) }),
  }),
])
export type EditorBlock = z.infer<typeof editorBlockSchema>

/** Корень документа Editor.js: `time`, `blocks`, `version`. */
export const blocksDocumentSchema = z.object({
  time: z.number().optional(),
  blocks: z.array(editorBlockSchema),
  version: z.string().optional(),
})
export type BlocksDocument = z.infer<typeof blocksDocumentSchema>
