import type { PageSeo } from '@blog/contracts'
import { plainText } from './seo.text.ts'

/** Collection previews use only public posts selected by the repository. */
export function addTopicArticles(
  page: PageSeo,
  posts: { slug: string; title: string; excerpt: string }[],
  origin: string,
): void {
  if (!posts.length) return
  page.body_text +=
    '\n' + posts.map((post) => `${plainText(post.title)}\n${plainText(post.excerpt)}`).join('\n')
  page.structured_data['@graph'].push({
    '@type': 'ItemList',
    '@id': `${page.canonical_url}#articles`,
    itemListElement: posts.map((post, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: plainText(post.title),
      url: `${origin}/p/${encodeURIComponent(post.slug)}`,
    })),
  })
}
