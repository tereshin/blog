import type { PageSeo, SocialImages } from '@blog/contracts'
import type { SeoGraphNode, SeoOptions, SeoRepository, SeoSite } from './seo.types.ts'
import { breadcrumbGraph, pageGraph, siteGraph } from './seo.graph.ts'
import { documentText, plainText, shortDescription } from './seo.text.ts'

const LABELS = {
  ru: {
    home: 'Свежее',
    popular: 'Популярное',
    rating: 'Рейтинг',
    about: 'О проекте',
    feed: 'Моя лента',
    search: 'Поиск',
    bookmarks: 'Закладки',
    messages: 'Сообщения',
    write: 'Редактор',
    admin: 'Администрирование',
    auth: 'Авторизация',
    followers: 'Подписчики',
    following: 'Подписки',
    missing: 'Страница не найдена',
  },
  en: {
    home: 'Fresh',
    popular: 'Popular',
    rating: 'Rating',
    about: 'About',
    feed: 'My feed',
    search: 'Search',
    bookmarks: 'Bookmarks',
    messages: 'Messages',
    write: 'Editor',
    admin: 'Administration',
    auth: 'Authentication',
    followers: 'Followers',
    following: 'Following',
    missing: 'Page not found',
  },
  sr: {
    home: 'Sveže',
    popular: 'Popularno',
    rating: 'Rang lista',
    about: 'O projektu',
    feed: 'Moj feed',
    search: 'Pretraga',
    bookmarks: 'Sačuvano',
    messages: 'Poruke',
    write: 'Uređivač',
    admin: 'Administracija',
    auth: 'Prijava',
    followers: 'Pratioci',
    following: 'Praćenja',
    missing: 'Stranica nije pronađena',
  },
} as const

function localPath(value: string): string | null {
  if (
    !value.startsWith('/') ||
    value.startsWith('//') ||
    value.includes('\\') ||
    Array.from(value).some((char) => char.charCodeAt(0) < 32)
  )
    return null
  const path = value.split(/[?#]/)[0] ?? '/'
  try {
    decodeURIComponent(path)
  } catch {
    return null
  }
  return path.length > 1 ? path.replace(/\/+$/, '') : path
}

function templateTitle(site: SeoSite, title: string): string {
  return site.seo.title_template
    .replaceAll('{title}', plainText(title))
    .replaceAll('{site_name}', site.name)
}

function simpleImages(url: string | null, alt: string): SocialImages | null {
  if (!url) return null
  const mime = /\.png(?:$|\?)/i.test(url)
    ? 'image/png'
    : /\.webp(?:$|\?)/i.test(url)
      ? 'image/webp'
      : /\.jpe?g(?:$|\?)/i.test(url)
        ? 'image/jpeg'
        : undefined
  const image = { url, alt, ...(mime ? { mime } : {}) }
  return { og: image, twitter: image, vk: image }
}

export function createSeoService(repository: SeoRepository, options: SeoOptions) {
  const origin = new URL(options.public_origin).origin
  return {
    async page(input_path: string): Promise<PageSeo> {
      const site = await repository.site()
      const labels = LABELS[site.locale]
      const path = localPath(input_path)
      const canonical = `${origin}${path ?? '/'}`
      const site_covers = await repository.covers('site')
      const fallback =
        simpleImages(site.social_cover.default_image_url, site.name) ??
        site_covers ??
        simpleImages(site.logo_url, site.name)
      const indexable = options.app_env === 'prod' && site.seo.indexing_enabled
      const neutral: PageSeo = {
        favicon: site.favicon,
        status: 200,
        title: site.seo.title || site.name,
        description: site.seo.description || shortDescription(site.about),
        canonical_url: canonical,
        robots: 'noindex, follow',
        site_name: site.name,
        locale: site.locale,
        og_type: 'website',
        images: fallback,
        body_text: '',
        structured_data: { '@context': 'https://schema.org', '@graph': siteGraph(site, origin) },
      }
      const missing = (): PageSeo => ({
        ...neutral,
        status: 404,
        title: templateTitle(site, labels.missing),
      })
      if (!path) return missing()
      const makePage = (
        name: string,
        description: string,
        type: string,
        should_index = true,
      ): PageSeo => ({
        ...neutral,
        title: templateTitle(site, name),
        description,
        robots: indexable && should_index ? 'index, follow' : 'noindex, follow',
        structured_data: {
          '@context': 'https://schema.org',
          '@graph': [
            ...siteGraph(site, origin),
            pageGraph(type, name, description, canonical, origin, site),
            breadcrumbGraph(
              canonical,
              path === '/'
                ? [{ name: site.name, url: `${origin}/` }]
                : [
                    { name: site.name, url: `${origin}/` },
                    { name, url: canonical },
                  ],
            ),
          ],
        },
      })
      const static_key = (
        { '/': 'home', '/popular': 'popular', '/rating': 'rating', '/about': 'about' } as const
      )[path as '/' | '/popular' | '/rating' | '/about']
      if (static_key) {
        const override = site.seo.pages[static_key]
        const name =
          override.title ||
          (static_key === 'home' ? site.seo.title || site.name : labels[static_key])
        const page = makePage(
          name,
          override.description || site.seo.description || shortDescription(site.about),
          static_key === 'about' ? 'AboutPage' : 'CollectionPage',
        )
        if (static_key === 'home') page.title = name
        page.body_text = static_key === 'about' ? plainText(site.about) : name
        return page
      }
      const article_match = /^\/p\/([^/]+)$/.exec(path)
      if (article_match?.[1]) {
        const article = await repository.article(decodeURIComponent(article_match[1]))
        if (!article) return missing()
        if (article.status !== 'published' || article.visibility !== 'public') return neutral
        const description =
          article.seo_description ||
          shortDescription(article.excerpt || documentText(article.blocks))
        const page = makePage(article.title, description, 'WebPage')
        page.canonical_url = `${origin}/p/${encodeURIComponent(article.slug)}`
        page.title = templateTitle(site, article.seo_title || article.title)
        page.og_type = 'article'
        page.images = (await repository.covers(article.id)) ?? fallback
        page.cover_pending = (await repository.pendingCover?.(article.id)) ?? false
        page.body_text = documentText(article.blocks)
        page.modified_at = article.updated_at.toISOString()
        if (article.published_at) page.published_at = article.published_at.toISOString()
        page.section = article.topic_title
        const author_slug =
          article.author_slug ?? (article.author_number ? String(article.author_number) : null)
        const author_url = author_slug
          ? `${origin}/u/${encodeURIComponent(author_slug)}`
          : undefined
        if (author_url) page.author_url = author_url
        const article_node: SeoGraphNode = {
          '@type': 'BlogPosting',
          '@id': `${page.canonical_url}#article`,
          url: page.canonical_url,
          headline: plainText(article.title),
          description,
          mainEntityOfPage: { '@id': `${page.canonical_url}#webpage` },
          publisher: { '@id': `${origin}/#publisher` },
          inLanguage: site.locale,
          dateModified: page.modified_at,
          ...(page.published_at ? { datePublished: page.published_at } : {}),
          articleSection: article.topic_title,
          ...(article.author_name
            ? {
                author: {
                  '@type': 'Person',
                  name: article.author_name,
                  ...(author_url ? { '@id': `${author_url}#person`, url: author_url } : {}),
                },
              }
            : {}),
          ...(article.first_image_url
            ? { image: article.first_image_url }
            : page.images
              ? { image: page.images.og.url }
              : {}),
        }
        page.structured_data['@graph'] = [
          ...siteGraph(site, origin),
          {
            ...pageGraph('WebPage', article.title, description, page.canonical_url, origin, site),
            mainEntity: { '@id': `${page.canonical_url}#article` },
          },
          article_node,
          breadcrumbGraph(page.canonical_url, [
            { name: site.name, url: `${origin}/` },
            {
              name: article.topic_title,
              url: `${origin}/t/${encodeURIComponent(article.topic_slug)}`,
            },
            { name: article.title, url: page.canonical_url },
          ]),
        ]
        return page
      }
      const profile_match = /^\/u\/([^/]+)(?:\/(followers|following))?$/.exec(path)
      if (profile_match?.[1]) {
        const profile = await repository.profile(decodeURIComponent(profile_match[1]))
        if (!profile) return missing()
        const profile_url = `${origin}/u/${encodeURIComponent(profile.slug ?? String(profile.public_number))}`
        const subpage = profile_match[2] as 'followers' | 'following' | undefined
        const name = subpage ? `${labels[subpage]}: ${profile.display_name}` : profile.display_name
        const description = shortDescription(
          profile.bio || `${profile.display_name} — ${site.name}`,
        )
        const page = makePage(
          name,
          description,
          subpage ? 'CollectionPage' : 'ProfilePage',
          !subpage,
        )
        page.canonical_url = `${profile_url}${subpage ? `/${subpage}` : ''}`
        page.body_text = `${profile.display_name}\n${plainText(profile.bio ?? '')}`
        page.images = simpleImages(profile.avatar_url, profile.display_name) ?? fallback
        page.og_type = subpage ? 'website' : 'profile'
        const graph = [
          ...siteGraph(site, origin),
          pageGraph(
            subpage ? 'CollectionPage' : 'ProfilePage',
            name,
            description,
            page.canonical_url,
            origin,
            site,
          ),
        ]
        if (!subpage) {
          graph[2] = {
            ...graph[2],
            dateCreated: profile.created_at.toISOString(),
            mainEntity: { '@id': `${profile_url}#person` },
          }
          graph.push({
            '@type': 'Person',
            '@id': `${profile_url}#person`,
            name: profile.display_name,
            url: profile_url,
            description: plainText(profile.bio ?? ''),
            ...(profile.avatar_url ? { image: profile.avatar_url } : {}),
          })
        }
        graph.push(
          breadcrumbGraph(page.canonical_url, [
            { name: site.name, url: `${origin}/` },
            ...(subpage ? [{ name: profile.display_name, url: profile_url }] : []),
            { name, url: page.canonical_url },
          ]),
        )
        page.structured_data['@graph'] = graph
        return page
      }
      const topic_match = /^\/t\/([^/]+)$/.exec(path)
      if (topic_match?.[1]) {
        const topic = await repository.topic(decodeURIComponent(topic_match[1]))
        if (!topic) return missing()
        const page = makePage(
          topic.title,
          shortDescription(topic.description || `${topic.title} — ${site.name}`),
          'CollectionPage',
        )
        page.images = simpleImages(topic.cover_url, topic.title) ?? fallback
        page.body_text = `${topic.title}\n${plainText(topic.description ?? '')}`
        return page
      }
      const private_key = /^\/(feed|search|bookmarks|messages|write|admin|auth)(?:\/|$)/.exec(
        path,
      )?.[1] as
        'feed' | 'search' | 'bookmarks' | 'messages' | 'write' | 'admin' | 'auth' | undefined
      // Exact application route list: arbitrary descendants are 404, even under a private prefix.
      const known_private =
        /^\/(?:feed|search|bookmarks|messages(?:\/(?:new|[0-9a-f-]{36}))?|write(?:\/[0-9a-f-]{36})?|admin\/(?:settings|topics|moderation)|auth\/action)$/.test(
          path,
        )
      if (private_key && known_private) return makePage(labels[private_key], '', 'WebPage', false)
      return missing()
    },
  }
}
