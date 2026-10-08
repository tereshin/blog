import { z } from 'zod'

/** Сервисы встраивания, для которых клиент подставляет свой iframe, а не HTML автора. */
export const EMBED_SERVICES = ['youtube', 'vimeo', 'twitter', 'github', 'codepen'] as const
export const embedServiceSchema = z.enum(EMBED_SERVICES)

export type ListItem = string | { content: string; items?: ListItem[]; meta?: { checked?: boolean } }

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
  z.object({ ...blockId, type: z.literal('header'), data: z.object({ text: z.string(), level: z.union([z.literal(2), z.literal(3), z.literal(4)]) }) }),
  z.object({
    ...blockId,
    type: z.literal('list'),
    data: z.object({ style: z.enum(['unordered', 'ordered', 'checklist']), items: z.array(listItemSchema) }),
  }),
  z.object({ ...blockId, type: z.literal('quote'), data: z.object({ text: z.string(), caption: z.string().optional() }) }),
  z.object({ ...blockId, type: z.literal('warning'), data: z.object({ title: z.string(), message: z.string() }) }),
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
    data: z.object({
      service: embedServiceSchema,
      source: z.string(),
      embed: z.string(),
      width: z.number().optional(),
      height: z.number().optional(),
    }),
  }),
  z.object({
    ...blockId,
    type: z.literal('table'),
    data: z.object({ content: z.array(z.array(z.string())), withHeadings: z.boolean().optional() }),
  }),
  z.object({
    ...blockId,
    type: z.literal('attaches'),
    data: z.object({
      file: z.object({ url: z.string(), size: z.number().optional(), extension: z.string().optional() }),
      title: z.string(),
      size: z.number().optional(),
      extension: z.string().optional(),
    }),
  }),
  z.object({
    ...blockId,
    type: z.literal('personality'),
    data: z.object({ name: z.string(), description: z.string().optional(), photo: z.string().optional() }),
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
