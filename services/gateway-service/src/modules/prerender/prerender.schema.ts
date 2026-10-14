import { z } from 'zod'

export const SeoDocumentSchema = z.strictObject({ content_type: z.enum(['text/plain', 'application/xml']), body: z.string() })
export type SeoDocument = z.infer<typeof SeoDocumentSchema>

/** `GET /sitemaps/:part.xml`. */
export const SitemapPartParamsSchema = z.object({ part: z.string() })
