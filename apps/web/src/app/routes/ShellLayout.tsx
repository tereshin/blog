import { getAdminRoute, getAdminParentPath } from '@/entities/admin'
import { useSettings } from '@/entities/settings'
import { useT } from '@/shared/i18n'
import { Suspense, useEffect, useState } from 'react'
import { useOutlet, useLocation, useMatches } from 'react-router'
import { PageSeo } from '@/widgets/page-seo'
import { AdminPagesPage } from '@/pages/admin-pages'
import { FreshFeedPage } from '@/pages/fresh-feed'
import { RestrictedNotice } from '@/entities/session'
import { NotificationBell } from '@/widgets/notification-bell'
import {
  CenterSkeleton,
  HeaderCenter,
  LeftNav,
  RightRail,
  Shell,
  SiteHeader,
  useShellStore,
} from '@/widgets/shell'
import type { CenterSkeletonKind } from '@/widgets/shell'
import { CenterErrorBoundary } from './CenterErrorBoundary.tsx'

function skeletonOf(matches: ReturnType<typeof useMatches>): CenterSkeletonKind {
  for (let index = matches.length - 1; index >= 0; index -= 1) {
    const handle = matches[index]?.handle as { skeleton?: CenterSkeletonKind } | undefined
    if (handle?.skeleton) return handle.skeleton
  }
  return 'feed'
}

/** Единственный layout-маршрут: шапка и обе карточки не размонтируются при переходах, меняется только центр. */
export function ShellLayout() {
  const { t } = useT()
  const { data: settings } = useSettings()
  const show_popular_comments = settings?.shell.popular_comments !== false
  const { pathname, search } = useLocation()
  const outlet = useOutlet()
  const is_page_editor = /^\/admin\/pages\/(?:new|[^/]+)\/?$/.test(pathname)
  const is_editor = /^\/write(?:\/|$)/.test(pathname) || is_page_editor
  const [previous, setPrevious] = useState({ pathname, outlet })
  if (!is_editor && previous.pathname !== pathname) setPrevious({ pathname, outlet })
  const background_path = previous.pathname
  const background = previous.outlet
  const shell_path = is_editor ? background_path : pathname
  const is_direct_editor =
    /^\/write(?:\/|$)/.test(background_path) || /^\/admin\/pages\/[^/]+\/?$/.test(background_path)
  const content_width = /^\/admin\/(?:moderation|pages)(?:\/|$)/.test(shell_path) ? 848 : 640
  const skeleton = skeletonOf(useMatches())
  const setHeaderCenter = useShellStore((state) => state.setHeaderCenter)
  const setArticleTopicId = useShellStore((state) => state.setArticleTopicId)
  const setNavOpen = useShellStore((state) => state.setNavOpen)

  // Панель навигации закрывается переходом; центр нового адреса начинается сверху (в `Shell` по `scroll_key`).
  useEffect(() => {
    setNavOpen(false)
    if (/^\/discovery(?:\/|$)/.test(pathname)) {
      setHeaderCenter(pathname.replace(/\/+$/, '') === '/discovery' ? { kind: 'empty' } : {
        kind: 'back', title: t(pathname === '/discovery/blogs' ? 'discovery.blogs' : 'discovery.topics'), to: '/discovery',
      })
      setArticleTopicId(null)
    }
    const admin_route = getAdminRoute(pathname)
    if (admin_route) {
      setHeaderCenter({
        kind: 'back',
        title: t(admin_route.title),
        to: getAdminParentPath(admin_route),
      })
      setArticleTopicId(null)
    }
  }, [pathname, t, setNavOpen, setHeaderCenter, setArticleTopicId])

  return (
    <>
      <PageSeo path={pathname + search} />
      <Shell
        content_width={content_width}
        header={
          <SiteHeader
            content_width={content_width}
            center={<HeaderCenter />}
            notifications={<NotificationBell />}
          />
        }
        left={<LeftNav />}
        right={show_popular_comments ? <RightRail /> : null}
        scroll_key={is_editor ? background_path : pathname}
        center={
          <CenterErrorBoundary key={is_editor ? background_path : pathname}>
            <Suspense fallback={<CenterSkeleton kind={skeleton} />}>
              <RestrictedNotice />
              {is_editor ? (
                is_direct_editor ? (
                  is_page_editor ? (
                    <AdminPagesPage />
                  ) : (
                    <FreshFeedPage />
                  )
                ) : (
                  background
                )
              ) : (
                outlet
              )}
              {is_editor ? outlet : null}
            </Suspense>
          </CenterErrorBoundary>
        }
      />
    </>
  )
}
