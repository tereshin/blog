import { http, HttpResponse } from 'msw'
import type { PageSeo } from '@blog/contracts'
import { SOCIAL_COVER_SIZES, socialCoverPreviewSchema } from '@blog/contracts'
import { buildFeedFixture } from '../fixtures/feed.ts'
import { readMockArticles } from './articles-store.ts'
import { readSite } from './shell.ts'
import { readMockViewer } from './session.ts'

export const seoHandlers = [
  http.get('*/v1/seo', ({ request }) => {
    const path = new URL(request.url).searchParams.get('path')?.split(/[?#]/)[0] ?? '/'
    const { settings } = readSite()
    const origin = window.location.origin
    const labels: Record<string, string> = {
      '/': settings.seo.title || settings.name,
      '/popular': 'Популярное',
      '/rating': 'Рейтинг',
      '/about': 'О проекте',
      '/search': 'Поиск',
      '/write': 'Редактор',
      '/bookmarks': 'Закладки',
      '/feed': 'Моя лента',
      '/admin/settings': 'Администрирование',
    }
    const page: PageSeo = {
      favicon: settings.favicon,
      status: 200,
      title: labels[path] ?? settings.name,
      description: settings.seo.description || settings.about,
      canonical_url: origin + path,
      robots: 'noindex, follow',
      site_name: settings.name,
      locale: settings.locale,
      og_type: 'website',
      images: null,
      body_text: '',
      structured_data: { '@context': 'https://schema.org', '@graph': [] },
    }
    const slug = /^\/p\/([^/]+)$/.exec(path)?.[1]
    if (slug) {
      const stored = readMockArticles().find((item) => item.slug === slug)
      const fixture = buildFeedFixture().find((item) => item.slug === slug)
      const title = stored
        ? stored.status === 'published' && stored.visibility === 'public'
          ? stored.title
          : null
        : fixture?.title
      if (title) {
        page.title = settings.seo.title_template
          .replaceAll('{title}', stored?.seo_title || title)
          .replaceAll('{site_name}', settings.name)
        page.description = stored?.seo_description || fixture?.excerpt || ''
        page.og_type = 'article'
        page.structured_data['@graph'] = [
          { '@type': 'BlogPosting', headline: title, url: page.canonical_url },
        ]
      } else if (!stored) page.status = 404
    }
    if (path.startsWith('/u/')) {
      const slug = path.split('/')[2]
      const profile_slug = slug === '1' ? 'anna' : slug === '5' ? 'reader' : slug
      page.canonical_url = `${origin}/u/${profile_slug}`
      page.title = `${profile_slug === 'anna' ? 'Анна Авторова' : 'Читатель'} — ${settings.name}`
      page.structured_data['@graph'] = [
        { '@type': 'ProfilePage', mainEntity: { '@type': 'Person', name: page.title } },
      ]
    }
    return HttpResponse.json(page)
  }),
  http.post('*/v1/media/social-cover-preview', async ({ request }) => {
    if (readMockViewer() !== 'superadmin')
      return HttpResponse.json(
        { code: 'forbidden', title: 'Forbidden', status: 403 },
        { status: 403 },
      )
    const parsed = socialCoverPreviewSchema.safeParse(await request.json())
    if (!parsed.success)
      return HttpResponse.json(
        { code: 'validation_failed', title: 'Invalid preview', status: 422 },
        { status: 422 },
      )
    // Browser fixtures emulate the endpoint; the real service uses its Satori worker.
    const { input, variant } = parsed.data
    const canvas = document.createElement('canvas')
    Object.assign(canvas, SOCIAL_COVER_SIZES[variant])
    const context = canvas.getContext('2d')
    if (!context) return HttpResponse.json({ status: 503 }, { status: 503 })
    context.fillStyle = input.settings.background_color
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.fillStyle = input.settings.text_color
    context.font = 'bold 48px sans-serif'
    let line = '',
      y = 100
    for (const word of input.title.split(' ')) {
      if (context.measureText(`${line} ${word}`).width > canvas.width - 140) {
        context.fillText(line, 70, y)
        line = word
        y += 60
      } else line = `${line} ${word}`.trim()
    }
    context.fillText(line, 70, y)
    context.font = 'bold 26px sans-serif'
    context.fillText(input.author_name ?? '', 70, canvas.height - 70)
    context.textAlign = 'right'
    context.fillText(input.site_name, canvas.width - 70, canvas.height - 70)
    return HttpResponse.json({ image_url: canvas.toDataURL('image/jpeg') })
  }),
]
