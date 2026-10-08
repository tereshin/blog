import { Suspense, useEffect } from 'react'
import { Outlet, useLocation } from 'react-router'
import { AccountMenu, CenterSkeleton, HeaderCenter, LeftNav, RightRail, Shell, SiteHeader, useShellStore } from '@/widgets/shell'
import { CenterErrorBoundary } from './CenterErrorBoundary.tsx'

/** Единственный layout-маршрут: шапка и обе карточки не размонтируются при переходах, меняется только центр. */
export function ShellLayout() {
  const { pathname } = useLocation()
  const setNavOpen = useShellStore((state) => state.setNavOpen)

  // Панель навигации закрывается переходом; центр нового адреса начинается сверху (в `Shell` по `scroll_key`).
  useEffect(() => {
    setNavOpen(false)
  }, [pathname, setNavOpen])

  return (
    <Shell
      header={<SiteHeader center={<HeaderCenter />} account={<AccountMenu />} />}
      left={<LeftNav />}
      right={<RightRail />}
      scroll_key={pathname}
      center={
        <CenterErrorBoundary key={pathname}>
          <Suspense fallback={<CenterSkeleton />}>
            <Outlet />
          </Suspense>
        </CenterErrorBoundary>
      }
    />
  )
}
