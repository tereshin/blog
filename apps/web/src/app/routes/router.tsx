import { createBrowserRouter } from 'react-router'
import type { RouteObject } from 'react-router'
import { AdminHomePage } from '@/pages/admin-home'
import { AdminMembersPage } from '@/pages/admin-members'
import { AdminAccessPage } from '@/pages/admin-access'
import { AdminReactionsPage } from '@/pages/admin-reactions'
import { AdminStatusIconsPage } from '@/pages/admin-status-icons'
import { AdminSeoPage } from '@/pages/admin-seo'
import { AdminPublisherPage } from '@/pages/admin-publisher'
import { AdminCoversPage } from '@/pages/admin-covers'
import { AdminHiddenPage } from '@/pages/admin-hidden'
import { AdminCommentReportsPage } from '@/pages/admin-comment-reports'
import { AdminFindArticlePage } from '@/pages/admin-find-article'
import { AboutPage } from '@/pages/about'
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
import { RatingPage } from '@/pages/rating'
import { SearchPage } from '@/pages/search'
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
    child('rating', <RatingPage />, 'feed'),
    child('bookmarks', <BookmarksPage />, 'feed'),
    child('search', <SearchPage />, 'feed'),
    child('about', <AboutPage />, 'article'),
    child('auth/action', <AuthActionPage />, 'article'),
    child('write', <EditorPage />, 'article'),
    child('write/:id', <EditorPage />, 'article'),
    child('admin', <AdminHomePage />, 'feed'),
    child('admin/members', <AdminMembersPage />, 'feed'),
    child('admin/settings/access', <AdminAccessPage />, 'feed'),
    child('admin/settings/reactions', <AdminReactionsPage />, 'feed'),
    child('admin/settings/status-icons', <AdminStatusIconsPage />, 'feed'),
    child('admin/settings/seo', <AdminSeoPage />, 'feed'),
    child('admin/settings/publisher', <AdminPublisherPage />, 'feed'),
    child('admin/settings/covers', <AdminCoversPage />, 'feed'),
    child('admin/moderation/hidden', <AdminHiddenPage />, 'feed'),
    child('admin/moderation/comments', <AdminCommentReportsPage />, 'feed'),
    child('admin/moderation/find', <AdminFindArticlePage />, 'feed'),
    child('admin/moderation', <AdminModerationPage />, 'feed'),
    child('admin/topics', <AdminTopicsPage />, 'feed'),
    child('admin/settings', <AdminSettingsPage />, 'feed'),
    { path: '*', element: <NotFoundPage />, handle: { skeleton: 'feed' } satisfies ShellHandle },
  ],
}

export const router = createBrowserRouter([shellRoute])
