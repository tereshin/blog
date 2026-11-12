import { http, HttpResponse } from 'msw'
import { leftSidebarSchema, updateLeftSidebarSchema, type AdminNavSection } from '@blog/contracts'
import { readMockPages } from './pages.ts'
import { readMockViewer } from './session.ts'
function failure(code: string, status: number) {
  return HttpResponse.json({ code, title: code, status }, { status })
}
function auth() {
  return readMockViewer() === 'superadmin' ? null : failure('forbidden', 403)
}
export function configHandlers(
  readSections: () => AdminNavSection[],
  setSections: (sections: AdminNavSection[]) => void,
) {
  let config_version = 1
  return [
    http.get('*/v1/admin/nav-sections/config', () => {
      const denied = auth()
      if (denied) return denied
      return HttpResponse.json(
        leftSidebarSchema.parse({
          version: config_version,
          sections: readSections().map((section) => ({
            id: section.id,
            title: section.title,
            items: section.items.map((item) => ({
              id: item.id,
              title: item.title,
              icon: item.icon,
              target:
                item.target.kind === 'url'
                  ? item.target
                  : { kind: 'page', page_id: item.target.page_id },
            })),
          })),
        }),
      )
    }),
    http.put('*/v1/admin/nav-sections/config', async ({ request }) => {
      const denied = auth()
      if (denied) return denied
      const parsed = updateLeftSidebarSchema.safeParse(await request.json())
      if (!parsed.success) return failure('validation_error', 400)
      if (parsed.data.expected_version !== config_version)
        return failure('nav_version_conflict', 409)
      setSections(
        parsed.data.sections.map((section, position) => ({
          ...section,
          position,
          items: section.items.map((item, position) => ({
            ...item,
            position,
            target:
              item.target.kind === 'url'
                ? item.target
                : {
                    kind: 'page' as const,
                    page_id: item.target.page_id,
                    slug:
                      readMockPages().find(
                        (page) =>
                          page.id === (item.target.kind === 'page' ? item.target.page_id : ''),
                      )?.slug ?? null,
                    status: 'published' as const,
                  },
          })),
        })),
      )
      config_version += 1
      return HttpResponse.json({ version: config_version, sections: parsed.data.sections })
    }),
  ]
}
