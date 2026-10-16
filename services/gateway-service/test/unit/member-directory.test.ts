import { describe, expect, it, vi } from 'vitest'
import type { ServiceClient, ServiceRequest } from '@blog/http-kit'
import { MemberDirectoryService } from '../../src/modules/proxy/member-directory.service.ts'

function id(number: number) {
  return `11111111-1111-4111-8111-${String(number).padStart(12, '0')}`
}
function user(number: number) {
  return {
    id: id(number),
    public_number: number,
    email: `user${number}@test.example`,
    email_verified: false,
    role: 'member',
    can_publish: true,
    is_restricted: false,
    created_at: '2026-10-16T00:00:00.000Z',
  }
}
function profile(number: number) {
  return { user_id: id(number), public_number: number, display_name: 'Софья', slug: null }
}
function client(work: (input: ServiceRequest) => unknown): ServiceClient {
  return {
    request: vi.fn(async (input) => ({ status: 200, headers: {}, body: work(input) })),
    close: async () => {},
  }
}

describe('member directory', () => {
  it('объединяет серверный поиск имени с почтой и сохраняет курсор и роль', async () => {
    const identity = client((input) => {
      const params = new URL(input.path, 'http://identity').searchParams
      expect(params.get('q')).toBe('Соф')
      expect(params.get('cursor')).toBe('4')
      expect(params.get('role')).toBe('member')
      expect(params.get('name_ids')).toBe(id(5))
      expect(input.service_context).toBe('context')
      return { items: [user(5)], next_cursor: '5' }
    })
    const content = client(() => [profile(5)])
    const page = await new MemberDirectoryService(identity, content).list(
      { q: 'Соф', cursor: 4, role: 'member', limit: 1 },
      'context',
      'correlation',
    )
    expect(page).toMatchObject({ items: [{ id: id(5), display_name: 'Софья' }], next_cursor: '5' })
  })

  it('продолжает поиск после окна удалённых аккаунтов, не пропуская более поздние имена', async () => {
    const content = client((input) => {
      const params = new URL(input.path, 'http://content').searchParams
      if (params.has('ids')) return [profile(150)]
      return params.get('cursor') === '0'
        ? Array.from({ length: 101 }, (_, index) => profile(index + 1))
        : [profile(150)]
    })
    const identity = client((input) => {
      const params = new URL(input.path, 'http://identity').searchParams
      if (params.get('cursor') === '0') {
        expect(params.get('through')).toBe('101')
        return { items: [], next_cursor: null }
      }
      expect(params.get('cursor')).toBe('101')
      expect(params.has('through')).toBe(false)
      return { items: [user(150)], next_cursor: null }
    })
    const page = await new MemberDirectoryService(identity, content).list(
      { q: 'Соф', limit: 25 },
      'context',
      'correlation',
    )
    expect(page.items.map((item) => item.id)).toEqual([id(150)])
    expect(page.next_cursor).toBeNull()
  })

  it('без строки поиска загружает только одну страницу аккаунтов и имена этой страницы', async () => {
    const identity = client(() => ({ items: [user(5)], next_cursor: null }))
    const content = client((input) => {
      expect(input.path).toContain('ids=')
      return [profile(5)]
    })
    const page = await new MemberDirectoryService(identity, content).list(
      { limit: 25 },
      'context',
      'correlation',
    )
    expect(content.request).toHaveBeenCalledTimes(1)
    expect(identity.request).toHaveBeenCalledTimes(1)
    expect(page.items[0]?.display_name).toBe('Софья')
  })
})
