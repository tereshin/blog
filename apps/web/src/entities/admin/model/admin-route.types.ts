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
  | 'badges'
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

