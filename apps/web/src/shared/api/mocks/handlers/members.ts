import { HttpResponse, http } from 'msw'
import { profile } from '../fixtures/profile.ts'
import { readMockViewer } from './session.ts'

function forbidden() {
  return HttpResponse.json(
    { code: 'forbidden', title: 'Недостаточно прав', status: 403 },
    { status: 403 },
  )
}

const MEMBERS = [
  {
    id: '0b3a4c50-3333-4c33-8c33-000000000002',
    public_number: 2,
    email: 'admin@example.test',
    email_verified: true,
    display_name: 'Алексей Бегин',
    slug: 'alex' as string | null,
    role: 'admin' as const,
    can_publish: true,
    is_restricted: false,
    created_at: '2026-01-01T00:00:00.000Z',
  },
  {
    id: '0b3a4c50-3333-4c33-8c33-000000000005',
    public_number: 5,
    email: 'reader@example.test',
    email_verified: false,
    display_name: profile.display_name,
    slug: profile.slug,
    role: 'member' as const,
    can_publish: true,
    is_restricted: false,
    created_at: '2026-01-02T00:00:00.000Z',
  },
  ...Array.from({ length: 28 }, (_, index) => ({
    id: `0b3a4c50-3333-4c33-8c33-${String(index + 10).padStart(12, '0')}`,
    email_verified: false,
    public_number: index + 10,
    email: `member${index + 10}@example.test`,
    display_name: index === 0 ? 'Софья' : `Участник ${index + 10}`,
    slug: null as string | null,
    role: 'member' as 'member' | 'admin',
    can_publish: true,
    is_restricted: false,
    created_at: '2026-01-03T00:00:00.000Z',
  })),
]

export const memberHandlers = [
  http.get('*/v1/users', ({ request }) => {
    if (readMockViewer() !== 'superadmin') return forbidden()
    const params = new URL(request.url).searchParams
    const q = (params.get('q') ?? '').trim().toLowerCase()
    const role = params.get('role'),
      cursor = Number(params.get('cursor') ?? 0),
      limit = Number(params.get('limit') ?? 25)
    const found = MEMBERS.filter(
      (user) =>
        user.public_number > cursor &&
        (!role || user.role === role) &&
        (user.email.includes(q) ||
          user.display_name.toLowerCase().includes(q) ||
          String(user.public_number) === q),
    )
    const items = found.slice(0, limit)
    return HttpResponse.json({
      items,
      next_cursor: found.length > limit ? String(items.at(-1)?.public_number) : null,
    })
  }),
  http.get('*/v1/admin/profiles', ({ request }) => {
    if (!['superadmin', 'admin'].includes(readMockViewer())) return forbidden()
    const ids = new URL(request.url).searchParams.get('ids')?.split(',') ?? []
    return HttpResponse.json(
      MEMBERS.filter((user) => ids.includes(user.id)).map((user) => ({
        user_id: user.id,
        public_number: user.public_number,
        display_name: user.display_name,
        slug: user.slug,
      })),
    )
  }),
  http.patch('*/v1/admin/profiles/:id', async ({ params, request }) => {
    if (readMockViewer() !== 'superadmin') return forbidden()
    const user = MEMBERS.find((item) => item.id === params.id)
    if (!user) return forbidden()
    const body = (await request.json()) as { display_name: string }
    user.display_name = body.display_name
    return HttpResponse.json({ user_id: user.id })
  }),
  http.delete('*/v1/users/:id', ({ params }) => {
    if (readMockViewer() !== 'superadmin') return forbidden()
    const index = MEMBERS.findIndex((item) => item.id === params.id)
    if (index < 0) return forbidden()
    MEMBERS.splice(index, 1)
    return new HttpResponse(null, { status: 204 })
  }),

  http.put('*/v1/users/:id/email-verification', ({ params }) => {
    if (readMockViewer() !== 'superadmin') return forbidden()
    const user = MEMBERS.find((item) => item.id === params.id)
    if (!user?.email) return forbidden()
    user.email_verified = true
    return new HttpResponse(null, { status: 204 })
  }),

  http.patch('*/v1/users/:id/role', async ({ params, request }) => {
    if (readMockViewer() !== 'superadmin') return forbidden()
    const user = MEMBERS.find((item) => item.id === params.id)
    if (!user) return forbidden()
    const body: unknown = await request.json()
    const role = typeof body === 'object' && body && 'role' in body ? body.role : null
    if (role !== 'member' && role !== 'admin')
      return HttpResponse.json(
        { code: 'validation_failed', title: 'Проверьте поля', status: 422 },
        { status: 422 },
      )
    user.role = role
    return HttpResponse.json(user)
  }),

  http.patch('*/v1/users/:id/publishing', async ({ params, request }) => {
    if (readMockViewer() !== 'superadmin') return forbidden()
    const user = MEMBERS.find((item) => item.id === params.id)
    if (!user)
      return HttpResponse.json(
        { code: 'not_found', title: 'Не найдено', status: 404 },
        { status: 404 },
      )
    const body: unknown = await request.json()
    user.can_publish =
      typeof body === 'object' && body && 'can_publish' in body
        ? Boolean(body.can_publish)
        : user.can_publish
    return HttpResponse.json(user)
  }),

  http.put('*/v1/users/:id/restriction', ({ params }) => {
    if (readMockViewer() !== 'superadmin') return forbidden()
    const user = MEMBERS.find((item) => item.id === params.id)
    if (!user)
      return HttpResponse.json(
        { code: 'not_found', title: 'Не найдено', status: 404 },
        { status: 404 },
      )
    user.is_restricted = true
    return HttpResponse.json(user)
  }),

  http.post('*/v1/users/:id/restrict', ({ params }) => {
    if (readMockViewer() !== 'superadmin') return forbidden()
    const user = MEMBERS.find((item) => item.id === params.id)
    if (!user)
      return HttpResponse.json(
        { code: 'not_found', title: 'Не найдено', status: 404 },
        { status: 404 },
      )
    user.is_restricted = true
    return HttpResponse.json(user)
  }),

  http.delete('*/v1/users/:id/restriction', ({ params }) => {
    if (readMockViewer() !== 'superadmin') return forbidden()
    const user = MEMBERS.find((item) => item.id === params.id)
    if (!user)
      return HttpResponse.json(
        { code: 'not_found', title: 'Не найдено', status: 404 },
        { status: 404 },
      )
    user.is_restricted = false
    return HttpResponse.json(user)
  }),

  http.delete('*/v1/users/:id/restrict', ({ params }) => {
    if (readMockViewer() !== 'superadmin') return forbidden()
    const user = MEMBERS.find((item) => item.id === params.id)
    if (!user)
      return HttpResponse.json(
        { code: 'not_found', title: 'Не найдено', status: 404 },
        { status: 404 },
      )
    user.is_restricted = false
    return HttpResponse.json(user)
  }),
]
