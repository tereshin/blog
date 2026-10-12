import { z } from 'zod'

export const faviconVariantSchema = z.enum(['png', 'svg', 'ico', 'apple', 'manifest'])
export type FaviconVariant = z.infer<typeof faviconVariantSchema>
export const faviconSettingsSchema = z.strictObject({
  png: z.url().nullable().default(null),
  svg: z.url().nullable().default(null),
  ico: z.url().nullable().default(null),
  apple: z.url().nullable().default(null),
  manifest: z.url().nullable().default(null),
})
export type FaviconSettings = z.infer<typeof faviconSettingsSchema>
export const SITE_ASSETS: readonly {
  variant: FaviconVariant
  path: string
  rel: string
  type?: string
  sizes?: string
}[] = [
  { variant: 'png', path: '/favicon-96x96.png', rel: 'icon', type: 'image/png', sizes: '96x96' },
  { variant: 'svg', path: '/favicon.svg', rel: 'icon', type: 'image/svg+xml' },
  { variant: 'ico', path: '/favicon.ico', rel: 'shortcut icon' },
  { variant: 'apple', path: '/apple-touch-icon.png', rel: 'apple-touch-icon', sizes: '180x180' },
  { variant: 'manifest', path: '/site.webmanifest', rel: 'manifest' },
]
