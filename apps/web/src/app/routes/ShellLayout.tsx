import { Suspense, useEffect } from 'react'
import { Outlet, useLocation, useMatches } from 'react-router'
import { NotificationBell } from '@/widgets/notification-bell'
import { AccountMenu, CenterSkeleton, HeaderCenter, LeftNav, RightRail, Shell, SiteHeader, useShellStore } from '@/widgets/shell'
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
  const { pathname } = useLocation()
  const skeleton = skeletonOf(useMatches())
  const setNavOpen = useShellStore((state) => state.setNavOpen)

  // Панель навигации закрывается переходом; центр нового адреса начинается сверху (в `Shell` по `scroll_key`).
  useEffect(() => {
    setNavOpen(false)
  }, [pathname, setNavOpen])

  return (
    <Shell
      header={<SiteHeader center={<HeaderCenter />} notifications={<NotificationBell />} account={<AccountMenu />} />}
      left={<LeftNav />}
      right={<RightRail />}
      scroll_key={pathname}
      center={
        <CenterErrorBoundary key={pathname}>
          <Suspense fallback={<CenterSkeleton kind={skeleton} />}>
            <Outlet />
          </Suspense>
        </CenterErrorBoundary>
      }
    />
  )
}
