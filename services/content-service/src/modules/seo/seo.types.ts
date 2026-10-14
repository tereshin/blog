import type {
  FaviconSettings,
  PageSeo,
  SeoSettings,
  SocialCoverSettings,
  SocialImages,
} from '@blog/contracts'

export type SeoSite = {
  favicon?: FaviconSettings
  name: string
  logo_url: string | null
  locale: 'ru' | 'en' | 'sr'
  seo: SeoSettings
  social_cover: SocialCoverSettings
}
export type SeoArticle = {
  id: string
  slug: string
  title: string
  seo_title: string | null
  seo_description: string | null
  excerpt: string
  first_image_url: string | null
  blocks: unknown
  status: 'draft' | 'published' | 'hidden' | 'deleted'
  visibility: 'public' | 'members' | 'author'
  published_at: Date | null
  updated_at: Date
  author_name: string | null
  author_slug: string | null
  author_number: number | null
  topic_title: string
  topic_slug: string
}
export type SeoProfile = {
  display_name: string
  bio: string | null
  avatar_url: string | null
  slug: string | null
  public_number: number
  created_at: Date
}
export type SeoTopic = {
  title: string
  description: string | null
  cover_url: string | null
  slug: string
}
export type SeoRepositoryPort = {
  simplePage?: (slug: string) => Promise<import('@blog/contracts').PublicPage | null>
  site: () => Promise<SeoSite>
  article: (slug: string) => Promise<SeoArticle | null>
  profile: (slug: string) => Promise<SeoProfile | null>
  topic: (slug: string) => Promise<SeoTopic | null>
  covers: (target_id: string) => Promise<SocialImages | null>
  pendingCover?: (target_id: string) => Promise<boolean>
}
export type SeoGraphNode = PageSeo['structured_data']['@graph'][number]
export type SeoOptions = { public_origin: string; app_env: 'prod' | 'dev' | 'local' }
