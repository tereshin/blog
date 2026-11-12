import { sidebarSchema, updateSidebarSchema } from '@blog/contracts'
import type { Sidebar } from '@blog/contracts'
import { readMockPages } from './pages.ts'
import { PROFILE_BADGES_FIXTURE } from '@/shared/api/mocks/fixtures/profile-badges'
import { HttpResponse, http } from 'msw'
import { googleFontStylesheet } from '@blog/contracts/fonts'
import {
  DEFAULT_REACTION_APPEARANCES,
  DEFAULT_SEO_SETTINGS,
  DEFAULT_SHELL_VISIBILITY,
  DEFAULT_SOCIAL_COVER_SETTINGS,
  DEFAULT_THEME_SETTINGS,
  reactionAppearancesSchema,
  shellVisibilitySchema,
  themeSettingsSchema,
} from '@blog/contracts'
import type {
  FaviconSettings,
  ProfileStatusIcon,
  ReactionAppearances,
  SeoSettings,
  ShellVisibility,
  SocialCoverSettings,
  ThemeSettings,
} from '@blog/contracts'
import popular_comments from '../fixtures/popular-comments.json'
import settings_fixture from '../fixtures/settings.json'
import topics_fixture from '../fixtures/topics.json'
import { readMockViewer } from './session.ts'

const SITE_KEY = 'mock_site'
// New badge catalog data lives only in memory, like the query cache.
let profile_badges = structuredClone(PROFILE_BADGES_FIXTURE)

type SiteSettings = {
  maintenance_enabled?: boolean
  welcome_content?: import('@blog/contracts').WelcomeContent | null
  name: string
  font_family?: string
  logo_url: string | null
  logo_dark_url?: string | null
  favicon?: FaviconSettings
  locale: 'ru' | 'en' | 'sr'
  registration_open: boolean
  new_members_can_publish: boolean
  reaction_appearances: ReactionAppearances
  profile_status_icons: ProfileStatusIcon[]
  profile_badges: import('@blog/contracts').BadgeDefinition[]
  seo: SeoSettings
  social_cover: SocialCoverSettings
  shell: ShellVisibility
  theme: ThemeSettings
}

export type SiteTopic = {
  id: string
  slug: string
  title: string
  description: string | null
  avatar_url: string | null
  cover_url: string | null
  status: 'active' | 'archived'
  position: number
}

type SiteState = { settings: SiteSettings; topics: SiteTopic[] }

function initialState(): SiteState {
  return {
    settings: {
      ...settings_fixture,
      locale: settings_fixture.locale as SiteSettings['locale'],
      maintenance_enabled: false,
      font_family: 'Inter',
      registration_open: true,
      new_members_can_publish: true,
      reaction_appearances: DEFAULT_REACTION_APPEARANCES,
      profile_status_icons: [],
      profile_badges,
      seo: DEFAULT_SEO_SETTINGS,
      social_cover: DEFAULT_SOCIAL_COVER_SETTINGS,
      shell: DEFAULT_SHELL_VISIBILITY,
      theme: DEFAULT_THEME_SETTINGS,
    },
    topics: topics_fixture.map((topic) => ({
      ...topic,
      status: topic.status as SiteTopic['status'],
    })),
  }
}

export function readSite(): SiteState {
  const raw = window.sessionStorage.getItem(SITE_KEY)
  if (!raw) return initialState()
  const parsed = JSON.parse(raw) as SiteState
  const settings = { ...initialState().settings, ...parsed.settings, profile_badges }
  const appearances = reactionAppearancesSchema.safeParse(settings.reaction_appearances)
  if (!appearances.success) settings.reaction_appearances = DEFAULT_REACTION_APPEARANCES
  settings.shell = shellVisibilitySchema.parse(settings.shell ?? {})
  settings.theme = themeSettingsSchema.parse(settings.theme ?? {})
  return { ...parsed, settings }
}

export function writeSite(state: SiteState): void {
  profile_badges = state.settings.profile_badges
  const settings: Partial<SiteSettings> = { ...state.settings }
  delete settings.profile_badges
  window.sessionStorage.setItem(SITE_KEY, JSON.stringify({ ...state, settings }))
}

function publicSettings(settings: SiteSettings) {
  return {
    maintenance_enabled: settings.maintenance_enabled ?? false,
    welcome_content: settings.welcome_content ?? null,
    name: settings.name,
    font_family: settings.font_family ?? 'Inter',
    font_stylesheet_url: googleFontStylesheet(settings.font_family ?? 'Inter'),
    logo_url: settings.logo_url,
    logo_dark_url: settings.logo_dark_url,
    favicon: settings.favicon,
    locale: settings.locale,
    reaction_appearances: settings.reaction_appearances,
    profile_status_icons: settings.profile_status_icons,
    profile_badges: settings.profile_badges,
    seo: settings.seo,
    social_cover: settings.social_cover,
    shell: settings.shell,
    theme: settings.theme,
  }
}

export function forbidden() {
  return HttpResponse.json(
    { code: 'forbidden', title: 'Раздел доступен только администратору площадки', status: 403 },
    { status: 403 },
  )
}

/** Данные колонок каркаса. Правки суперадминистратора живут в sessionStorage вкладки, чтобы пережить перезагрузку. */
let sidebar: Sidebar = sidebarSchema.parse({ version: 1, sections: [{
  id: '1c6f716b-077a-4dad-a16f-66cc074b3d86', title: 'Popular comments', has_card: true,
  widgets: [{ id: 'e42f1358-894a-4bd7-970b-23f382b3aa18', type: 'adminComments', data: {} }],
}] })
export const shellHandlers = [
  http.get('*/v1/settings/admin', () => {
    if (readMockViewer() !== 'superadmin') return forbidden()
    const settings = readSite().settings
    return HttpResponse.json({ ...settings, ...publicSettings(settings), public_origin: window.location.origin })
  }),
  http.get('*/v1/settings', () => HttpResponse.json(publicSettings(readSite().settings))),
  http.put('*/v1/settings', async ({ request }) => {
    if (readMockViewer() !== 'superadmin') return forbidden()
    const body = (await request.json()) as SiteSettings
    const state = readSite()
    state.settings = { ...state.settings, ...body }
    writeSite(state)
    return HttpResponse.json({ ...state.settings, ...publicSettings(state.settings) })
  }),
  http.get('*/v1/sidebar', () => HttpResponse.json({
    ...sidebar,
    sections: sidebar.sections.map(section => ({
      ...section,
      widgets: section.widgets.map(widget => {
        if (widget.type === 'adminFeedback') return { ...widget, data: { fields: widget.data.fields } }
        if (widget.type !== 'adminButtons') return widget
        return { ...widget, data: { ...widget.data, items: widget.data.items.flatMap(item => {
          const target = item.target
          const linked = target.kind === 'page' ? readMockPages().find(page => page.id === target.page_id && page.status === 'published') : null
          const href = target.kind === 'url' ? target.url : linked ? '/pages/' + linked.slug : ''
          return href ? [{ id: item.id, title: item.title, icon: item.icon, href, is_external: target.kind === 'url' }] : []
        }) } }
      }),
    })),
  })),
  http.get('*/v1/admin/sidebar', () => readMockViewer() === 'superadmin' ? HttpResponse.json(sidebar) : forbidden()),
  http.put('*/v1/admin/sidebar', async ({ request }) => {
    if (readMockViewer() !== 'superadmin') return forbidden()
    const parsed = updateSidebarSchema.safeParse(await request.json())
    if (!parsed.success) return HttpResponse.json({ code: 'validation_error' }, { status: 400 })
    if (parsed.data.expected_version !== sidebar.version) return HttpResponse.json({ code: 'sidebar_version_conflict' }, { status: 409 })
    sidebar = sidebarSchema.parse({ sections: parsed.data.sections, version: sidebar.version + 1 })
    return HttpResponse.json(sidebar)
  }),
  http.get(/\/v1\/comments\/(popular|widget)(?:$|\?)/, () => {
    const mode = window.localStorage.getItem('mock_rail')
    if (mode === 'empty') return HttpResponse.json([])
    if (mode === 'error')
      return HttpResponse.json(
        { code: 'unavailable', title: 'Не удалось загрузить комментарии', status: 500 },
        { status: 500 },
      )
    return HttpResponse.json(popular_comments)
  }),
  http.put('*/v1/events/subscriptions', () => HttpResponse.json({ article_ids: [] })),
]
