import { createBrowserRouter } from 'react-router'
import { AboutPage } from '@/pages/about'
import { AdminSettingsPage } from '@/pages/admin-settings'
import { AdminTopicsPage } from '@/pages/admin-topics'
import { ArticlePage } from '@/pages/article'
import { EditorPage } from '@/pages/editor'
import { FollowersPage } from '@/pages/followers'
import { FollowingPage } from '@/pages/following'
import { FreshFeedPage } from '@/pages/fresh-feed'
import { NotFoundPage } from '@/pages/not-found'
import { ProfilePage } from '@/pages/profile'
import { RatingPage } from '@/pages/rating'
import { ShellLayout } from './ShellLayout.tsx'

// Один родительский маршрут каркаса. Остальные адреса таблицы `contracts/sections.md`
// добавляются дочерними `React.lazy`-страницами вместе со своими историями.
export const router = createBrowserRouter([
  {
    path: '/',
    element: <ShellLayout />,
    children: [
      { index: true, element: <FreshFeedPage /> },
      { path: 'p/:slug', element: <ArticlePage /> },
      { path: 'u/:slug', element: <ProfilePage /> },
      { path: 'u/:slug/followers', element: <FollowersPage /> },
      { path: 'u/:slug/following', element: <FollowingPage /> },
      { path: 'rating', element: <RatingPage /> },
      { path: 'about', element: <AboutPage /> },
      { path: 'write/:id?', element: <EditorPage /> },
      { path: 'admin/settings', element: <AdminSettingsPage /> },
      { path: 'admin/topics', element: <AdminTopicsPage /> },
      // Адреса, которых ещё нет в приложении, остаются внутри каркаса.
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])
