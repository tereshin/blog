import { createBrowserRouter } from 'react-router'
import { ArticlePage } from '@/pages/article'
import { FreshFeedPage } from '@/pages/fresh-feed'
import { NotFoundPage } from '@/pages/not-found'
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
      // Адреса, которых ещё нет в приложении, остаются внутри каркаса.
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])
