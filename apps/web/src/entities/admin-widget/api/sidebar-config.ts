import { leftSidebarSchema, sidebarSchema } from '@blog/contracts'
import type { LeftSidebar, Sidebar } from '@blog/contracts'
import { http } from '@/shared/api'
export const sidebarConfigKeys = {
  left: ['nav-sections', 'config'] as const,
  right: ['widgets', 'admin'] as const,
}
export const getLeftSidebar = (signal?: AbortSignal) =>
  http.get('/v1/admin/nav-sections/config', leftSidebarSchema, { signal })
export const saveLeftSidebar = (config: LeftSidebar, key: string) =>
  http.put('/v1/admin/nav-sections/config', leftSidebarSchema, {
    body: { expected_version: config.version, sections: config.sections },
    idempotency_key: key,
  })
export const getRightSidebar = (signal?: AbortSignal) =>
  http.get('/v1/admin/sidebar', sidebarSchema, { signal })
export const saveRightSidebar = (config: Sidebar, key: string) =>
  http.put('/v1/admin/sidebar', sidebarSchema, {
    body: { expected_version: config.version, sections: config.sections },
    idempotency_key: key,
  })
