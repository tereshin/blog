import { z } from 'zod'
import { faviconSettingsSchema } from './site-assets.ts'

const httpUrl = z
  .url()
  .refine((value) => ['http:', 'https:'].includes(new URL(value).protocol), 'HTTP(S) URL required')
const pageOverrideSchema = z.strictObject({
  title: z.string().max(200).default(''),
  description: z.string().max(500).default(''),
})
export const seoSettingsSchema = z.strictObject({
  title: z.string().max(200).default(''),
  description: z.string().max(500).default(''),
  title_template: z
    .string()
    .max(250)
    .refine((value) => value.includes('{title}'), 'Template must include {title}')
    .default('{title} — {site_name}'),
  indexing_enabled: z.boolean().default(true),
  pages: z
    .strictObject({
      home: pageOverrideSchema.default({ title: '', description: '' }),
      popular: pageOverrideSchema.default({ title: '', description: '' }),
      rating: pageOverrideSchema.default({ title: '', description: '' }),
      about: pageOverrideSchema.default({ title: '', description: '' }),
    })
    .default({
      home: { title: '', description: '' },
      popular: { title: '', description: '' },
      rating: { title: '', description: '' },
      about: { title: '', description: '' },
    }),
  publisher: z
    .strictObject({
      name: z.string().max(100).default(''),
      logo_url: httpUrl.nullable().default(null),
      same_as: z.array(httpUrl).max(20).default([]),
    })
    .default({ name: '', logo_url: null, same_as: [] }),
})
export type SeoSettings = z.infer<typeof seoSettingsSchema>
export const DEFAULT_SEO_SETTINGS = seoSettingsSchema.parse({})

export const socialCoverSettingsSchema = z.strictObject({
  background_mode: z.enum(['image', 'color']).default('image'),
  background_color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .default('#20232A'),
  text_color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .default('#FFFFFF'),
  logo_url: httpUrl.nullable().default(null),
  default_image_url: httpUrl.nullable().default(null),
})
export type SocialCoverSettings = z.infer<typeof socialCoverSettingsSchema>
export const DEFAULT_SOCIAL_COVER_SETTINGS = socialCoverSettingsSchema.parse({})

export const socialCoverVariantSchema = z.enum(['og', 'twitter', 'vk'])
export type SocialCoverVariant = z.infer<typeof socialCoverVariantSchema>
export const SOCIAL_COVER_SIZES = {
  og: { width: 1200, height: 630 },
  twitter: { width: 1200, height: 630 },
  vk: { width: 1074, height: 480 },
} as const
export const socialImageSchema = z.strictObject({
  url: httpUrl,
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  alt: z.string(),
  mime: z.string().optional(),
})
export const socialImagesSchema = z.strictObject({
  og: socialImageSchema,
  twitter: socialImageSchema,
  vk: socialImageSchema,
})
export type SocialImages = z.infer<typeof socialImagesSchema>

export const socialCoverInputSchema = z.strictObject({
  title: z.string().min(1).max(200),
  author_name: z.string().max(50).nullable(),
  site_name: z.string().min(1).max(100),
  image_url: httpUrl.nullable(),
  settings: socialCoverSettingsSchema,
})
export type SocialCoverInput = z.infer<typeof socialCoverInputSchema>
export const socialCoverPreviewSchema = z.strictObject({
  variant: socialCoverVariantSchema,
  input: socialCoverInputSchema,
})
export const socialCoverPreviewResponseSchema = z.strictObject({
  image_url: z.string().startsWith('data:image/jpeg;base64,'),
})

export const pageSeoSchema = z.strictObject({
  status: z.union([z.literal(200), z.literal(404)]),
  title: z.string(),
  description: z.string(),
  canonical_url: httpUrl,
  robots: z.enum(['index, follow', 'noindex, follow']),
  site_name: z.string(),
  favicon: faviconSettingsSchema.optional(),
  locale: z.enum(['ru', 'en', 'sr']),
  og_type: z.enum(['website', 'article', 'profile']),
  images: socialImagesSchema.nullable(),
  cover_pending: z.boolean().optional(),
  author_url: httpUrl.optional(),
  published_at: z.iso.datetime().optional(),
  modified_at: z.iso.datetime().optional(),
  section: z.string().optional(),
  body_text: z.string(),
  structured_data: z.strictObject({
    '@context': z.literal('https://schema.org'),
    '@graph': z.array(z.record(z.string(), z.json())),
  }),
})
export type PageSeo = z.infer<typeof pageSeoSchema>
export const seoPathQuerySchema = z.strictObject({
  path: z
    .string()
    .max(2048)
    .regex(/^\/(?!\/)/)
    .default('/'),
})
