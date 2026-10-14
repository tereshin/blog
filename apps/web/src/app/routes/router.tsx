import { AdminBadgesPage } from '@/pages/admin-badges'
import { createBrowserRouter } from 'react-router'
import type { RouteObject } from 'react-router'
import { ADMIN_ROUTES } from '@/entities/admin'
import type { AdminRouteId } from '@/entities/admin'
import { AdminGeneralPage } from '@/pages/admin-general'
import { AdminArticleReportsPage } from '@/pages/admin-article-reports'
import { AdminHomePage } from '@/pages/admin-home'
import { AdminMembersPage } from '@/pages/admin-members'
import { AdminAccessPage } from '@/pages/admin-access'
import { AdminLayoutPage } from '@/pages/admin-layout'
import { AdminReactionsPage } from '@/pages/admin-reactions'
import { AdminStatusIconsPage } from '@/pages/admin-status-icons'
import { AdminSeoPage } from '@/pages/admin-seo'
import { AdminPublisherPage } from '@/pages/admin-publisher'
import { AdminCoversPage } from '@/pages/admin-covers'
import { AdminHiddenPage } from '@/pages/admin-hidden'
import { AdminCommentReportsPage } from '@/pages/admin-comment-reports'
import { AdminFindArticlePage } from '@/pages/admin-find-article'
import { AdminPagesPage } from '@/pages/admin-pages'
import { AdminNavSectionsPage } from '@/pages/admin-nav-sections'
import { AdminPageNewPage } from '@/pages/admin-page-new'
import { AdminPageEditPage } from '@/pages/admin-page-edit'
import { SimplePage } from '@/pages/simple-page'
import { AuthActionPage } from '@/pages/auth-action'
import { AdminModerationPage } from '@/pages/admin-moderation'
import { AdminSettingsPage } from '@/pages/admin-settings'
import { AdminTopicsPage } from '@/pages/admin-topics'
import { ArticlePage } from '@/pages/article'
import { BookmarksPage } from '@/pages/bookmarks'
import { EditorPage } from '@/pages/editor'
import { FollowersPage } from '@/pages/followers'
import { FollowingPage } from '@/pages/following'
import { FreshFeedPage } from '@/pages/fresh-feed'
import { MessagesPage } from '@/pages/messages'
import { MyFeedPage } from '@/pages/my-feed'
import { NotFoundPage } from '@/pages/not-found'
import { PopularFeedPage } from '@/pages/popular-feed'
import { ProfilePage } from '@/pages/profile'
import { DiscoveryPage } from '@/pages/discovery'
import { DiscoveryBlogsPage } from '@/pages/discovery-blogs'
import { DiscoveryTopicsPage } from '@/pages/discovery-topics'
import { DiscoveryRedirect } from './DiscoveryRedirect.tsx'
import { TopicPage } from '@/pages/topic'
import type { CenterSkeletonKind } from '@/widgets/shell'
import { ShellLayout } from './ShellLayout.tsx'

type ShellHandle = { skeleton: CenterSkeletonKind }

function child(
  path: string,
  element: RouteObject['element'],
  skeleton: CenterSkeletonKind,
): RouteObject {
  return { path, element, handle: { skeleton } satisfies ShellHandle }
}

const ADMIN_PAGES: Record<AdminRouteId, RouteObject['element']> = {
  pages: <AdminPagesPage />,
  sections: <AdminNavSectionsPage />,
  home: <AdminHomePage />,
  settings: <AdminSettingsPage />,
  moderation: <AdminModerationPage />,
  members: <AdminMembersPage />,
  topics: <AdminTopicsPage />,
  general: <AdminGeneralPage />,
  access: <AdminAccessPage />,
  layout: <AdminLayoutPage />,
  reactions: <AdminReactionsPage />,
  'status-icons': <AdminStatusIconsPage />,
  badges: <AdminBadgesPage />,
  seo: <AdminSeoPage />,
  publisher: <AdminPublisherPage />,
  covers: <AdminCoversPage />,
  articles: <AdminArticleReportsPage />,
  comments: <AdminCommentReportsPage />,
  hidden: <AdminHiddenPage />,
  find: <AdminFindArticlePage />,
}

/**
 * Один родительский маршрут каркаса. Все публичные и административные адреса — его дети,
 * каждый загружается лениво. Панели (вход, профиль, настройки, предупреждение) маршрутами не являются.
 */
export const shellRoute: RouteObject = {
  path: '/',
  element: <ShellLayout />,
  children: [
    { index: true, element: <FreshFeedPage />, handle: { skeleton: 'feed' } satisfies ShellHandle },
    child('popular', <PopularFeedPage />, 'feed'),
    child('feed', <MyFeedPage />, 'feed'),
    child('t/:slug', <TopicPage />, 'feed'),
    child('p/:slug', <ArticlePage />, 'article'),
    child('u/:slug', <ProfilePage />, 'profile'),
    child('u/:slug/followers', <FollowersPage />, 'profile'),
    child('u/:slug/following', <FollowingPage />, 'profile'),
    child('messages', <MessagesPage />, 'feed'),
    child('messages/new', <MessagesPage />, 'feed'),
    child('messages/:id', <MessagesPage />, 'feed'),
    child('discovery', <DiscoveryPage />, 'feed'),
    child('discovery/blogs', <DiscoveryBlogsPage />, 'profile'),
    child('discovery/topics', <DiscoveryTopicsPage />, 'profile'),
    child('rating', <DiscoveryRedirect to="/discovery/blogs" />, 'profile'),
    child('bookmarks', <BookmarksPage />, 'feed'),
    child('search', <DiscoveryRedirect to="/discovery" />, 'feed'),
    child('pages/:slug', <SimplePage />, 'article'),
    child('admin/pages/new', <AdminPageNewPage />, 'article'),
    child('admin/pages/:id', <AdminPageEditPage />, 'article'),
    child('auth/action', <AuthActionPage />, 'article'),
    child('write', <EditorPage />, 'article'),
    child('write/:id', <EditorPage />, 'article'),
    ...(Object.keys(ADMIN_ROUTES) as AdminRouteId[]).map((id) =>
      child(ADMIN_ROUTES[id].path.slice(1), ADMIN_PAGES[id], 'feed'),
    ),
    { path: '*', element: <NotFoundPage />, handle: { skeleton: 'feed' } satisfies ShellHandle },
  ],
}

export const router = createBrowserRouter([shellRoute])
