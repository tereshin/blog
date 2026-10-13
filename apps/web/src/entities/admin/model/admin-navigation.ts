import type { MessageKey } from '@/shared/i18n'
export type AdminIcon =
  | 'pages'
  | 'sections'
  | 'moderation'
  | 'settings'
  | 'members'
  | 'topics'
  | 'general'
  | 'access'
  | 'layout'
  | 'reactions'
  | 'status'
  | 'seo'
  | 'publisher'
  | 'covers'
  | 'articles'
  | 'comments'
  | 'hidden'
  | 'find'

export type AdminCatalogId = 'home' | 'settings' | 'moderation'
export type AdminSettingsRouteId =
  | 'general'
  | 'access'
  | 'layout'
  | 'reactions'
  | 'status-icons'
  | 'seo'
  | 'publisher'
  | 'covers'
export type AdminRouteId =
  | 'pages'
  | 'sections'
  | AdminCatalogId
  | AdminSettingsRouteId
  | 'members'
  | 'topics'
  | 'articles'
  | 'comments'
  | 'hidden'
  | 'find'
export type AdminRoute = {
  path: string
  parent: AdminCatalogId | null
  title: MessageKey
  label?: MessageKey
  description: MessageKey
  icon: AdminIcon
  role: 'admin' | 'superadmin'
}

export const ADMIN_ROUTES: Record<AdminRouteId, AdminRoute> = {
  home: {
    path: '/admin',
    parent: null,
    title: 'admin.title',
    description: 'admin.home_hint',
    icon: 'settings',
    role: 'admin',
  },
  moderation: {
    path: '/admin/moderation',
    parent: 'home',
    title: 'admin.moderation',
    description: 'admin.moderation.description',
    icon: 'moderation',
    role: 'admin',
  },
  settings: {
    path: '/admin/settings',
    parent: 'home',
    title: 'admin.settings',
    description: 'admin.settings.description',
    icon: 'settings',
    role: 'superadmin',
  },
  members: {
    path: '/admin/members',
    parent: 'home',
    title: 'admin.members.title',
    label: 'admin.members.people',
    description: 'admin.members.description',
    icon: 'members',
    role: 'superadmin',
  },
  topics: {
    path: '/admin/topics',
    parent: 'home',
    title: 'admin.topics',
    label: 'shell.nav.topics',
    description: 'admin.topics.description_hint',
    icon: 'topics',
    role: 'superadmin',
  },
  pages: {
    path: '/admin/pages',
    parent: 'home',
    title: 'pages.title',
    description: 'pages.description',
    icon: 'pages',
    role: 'superadmin',
  },
  sections: {
    path: '/admin/sections',
    parent: 'home',
    title: 'nav.sections.title',
    description: 'nav.sections.description',
    icon: 'sections',
    role: 'superadmin',
  },
  general: {
    path: '/admin/settings/general',
    parent: 'settings',
    title: 'admin.settings.general',
    description: 'admin.settings.general_hint',
    icon: 'general',
    role: 'superadmin',
  },
  access: {
    path: '/admin/settings/access',
    parent: 'settings',
    title: 'admin.settings.access',
    description: 'admin.settings.access_hint',
    icon: 'access',
    role: 'superadmin',
  },
  layout: {
    path: '/admin/settings/layout',
    parent: 'settings',
    title: 'admin.settings.layout',
    description: 'admin.settings.layout_hint',
    icon: 'layout',
    role: 'superadmin',
  },
  reactions: {
    path: '/admin/settings/reactions',
    parent: 'settings',
    title: 'admin.settings.reactions',
    description: 'admin.settings.reactions_hint',
    icon: 'reactions',
    role: 'superadmin',
  },
  'status-icons': {
    path: '/admin/settings/status-icons',
    parent: 'settings',
    title: 'admin.settings.status_icons',
    description: 'admin.settings.status_icons_hint',
    icon: 'status',
    role: 'superadmin',
  },
  seo: {
    path: '/admin/settings/seo',
    parent: 'settings',
    title: 'seo.settings',
    description: 'admin.settings.seo_hint',
    icon: 'seo',
    role: 'superadmin',
  },
  publisher: {
    path: '/admin/settings/publisher',
    parent: 'settings',
    title: 'seo.publisher',
    description: 'seo.publisher_hint',
    icon: 'publisher',
    role: 'superadmin',
  },
  covers: {
    path: '/admin/settings/covers',
    parent: 'settings',
    title: 'seo.covers',
    description: 'seo.covers_hint',
    icon: 'covers',
    role: 'superadmin',
  },
  articles: {
    path: '/admin/moderation/articles',
    parent: 'moderation',
    title: 'admin.moderation.articles',
    description: 'admin.moderation.articles_hint',
    icon: 'articles',
    role: 'admin',
  },
  comments: {
    path: '/admin/moderation/comments',
    parent: 'moderation',
    title: 'comment.reports_title',
    description: 'admin.moderation.comments_hint',
    icon: 'comments',
    role: 'admin',
  },
  hidden: {
    path: '/admin/moderation/hidden',
    parent: 'moderation',
    title: 'admin.moderation.hidden_articles',
    description: 'admin.moderation.hidden_empty_hint',
    icon: 'hidden',
    role: 'admin',
  },
  find: {
    path: '/admin/moderation/find',
    parent: 'moderation',
    title: 'admin.moderation.find_title',
    description: 'admin.moderation.find_hint',
    icon: 'find',
    role: 'admin',
  },
}

export function getAdminRoute(pathname: string): AdminRoute | undefined {
  const path = pathname.replace(/\/$/, '')
  if (path.startsWith('/admin/pages/')) return { ...ADMIN_ROUTES.pages, path }
  return Object.values(ADMIN_ROUTES).find((route) => route.path === path)
}

export function getAdminParentPath(route: AdminRoute): string {
  if (route.path.startsWith('/admin/pages/')) return '/admin/pages'
  return route.parent ? ADMIN_ROUTES[route.parent].path : '/'
}

export function getAdminChildren(parent: AdminCatalogId, is_superadmin: boolean): AdminRoute[] {
  return Object.values(ADMIN_ROUTES).filter(
    (route) => route.parent === parent && (route.role === 'admin' || is_superadmin),
  )
}
