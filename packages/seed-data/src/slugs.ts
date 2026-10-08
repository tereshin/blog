import type { SeedArticle, SeedProfile, SeedSlug, SeedTopic } from './types.ts'

/** Реестр занятых адресов: профили с коротким адресом, темы и статьи. Удалённая статья адрес освобождает. */
export function buildSlugs(profiles: readonly SeedProfile[], topics: readonly SeedTopic[], articles: readonly SeedArticle[]): SeedSlug[] {
  return [
    ...profiles.flatMap((profile) => (profile.slug ? [{ slug: profile.slug, owner_type: 'profile' as const, owner_id: profile.user_id }] : [])),
    ...topics.map((topic) => ({ slug: topic.slug, owner_type: 'topic' as const, owner_id: topic.id })),
    ...articles.filter((article) => article.status !== 'deleted').map((article) => ({ slug: article.slug, owner_type: 'article' as const, owner_id: article.id })),
  ]
}
