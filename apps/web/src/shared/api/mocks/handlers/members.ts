import { HttpResponse, http } from 'msw'
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
    role: 'admin' as const,
    can_publish: true,
    is_restricted: false,
    created_at: '2026-01-01T00:00:00.000Z',
  },
  {
    id: '0b3a4c50-3333-4c33-8c33-000000000005',
    public_number: 5,
    email: 'reader@example.test',
    role: 'member' as const,
    can_publish: true,
    is_restricted: false,
    created_at: '2026-01-02T00:00:00.000Z',
  },
]

export const memberHandlers = [
  http.get('*/v1/users', ({ request }) => {
    if (readMockViewer() !== 'superadmin') return forbidden()
    const q = (new URL(request.url).searchParams.get('q') ?? '').toLowerCase()
    const items = MEMBERS.filter(
      (user) => user.email.includes(q) || String(user.public_number) === q,
    )
    return HttpResponse.json({ items, next_cursor: null })
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
