import { z } from 'zod'

const httpUrlSchema = z
  .url()
  .max(2048)
  .refine((value) => {
    const url = new URL(value)
    return (
      ['http:', 'https:'].includes(url.protocol) &&
      !url.hostname.includes('*') &&
      !url.username &&
      !url.password &&
      !url.search &&
      !url.hash
    )
  }, 'Use an HTTP(S) URL without credentials, query or fragment')

export const imageCompressionSchema = z.strictObject({
  enabled: z.boolean().default(true),
  format: z.enum(['original', 'webp']).default('webp'),
  quality: z.number().int().min(1).max(100).default(82),
  max_dimension: z.number().int().min(64).max(8192).default(2560),
})
export type ImageCompression = z.infer<typeof imageCompressionSchema>

export const s3SettingsSchema = z.strictObject({
  endpoint: httpUrlSchema,
  region: z.string().trim().min(1).max(100),
  bucket: z
    .string()
    .trim()
    .min(1)
    .max(63)
    .regex(/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/),
  public_url: httpUrlSchema,
  force_path_style: z.boolean().default(true),
})
export type S3Settings = z.infer<typeof s3SettingsSchema>

export const updateMediaSettingsSchema = z.strictObject({
  compression: imageCompressionSchema,
  // null restores server storage; its existing files stay available.
  storage: s3SettingsSchema
    .extend({
      access_key: z.string().trim().min(1).max(256).optional(),
      secret_key: z.string().min(1).max(1024).optional(),
    })
    .nullable(),
})
export type UpdateMediaSettings = z.infer<typeof updateMediaSettingsSchema>

export const mediaSettingsSchema = z.strictObject({
  compression: imageCompressionSchema,
  storage: s3SettingsSchema.extend({ has_credentials: z.boolean() }),
  use_custom_storage: z.boolean(),
})
export type MediaSettings = z.infer<typeof mediaSettingsSchema>
export const storageTestResultSchema = z.strictObject({ ok: z.literal(true) })
