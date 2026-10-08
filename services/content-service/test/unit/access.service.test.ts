import { describe, expect, it } from 'vitest'
import type { ArticleAccessFields, ServiceContext } from '@blog/contracts'
import { canRead, createAccessService } from '../../src/modules/access/index.ts'

const AUTHOR = '3f1d3c9e-1b0a-4a55-8f2b-6f6d5d3f7a22'
const OTHER = '9a1d3c9e-1b0a-4a55-8f2b-6f6d5d3f7a99'

const viewers = {
  guest: { role: 'guest', is_restricted: false, can_publish: false, viewer_key: 'guest:1' },
  member: { user_id: OTHER, role: 'member', is_restricted: false, can_publish: true, viewer_key: `user:${OTHER}` },
  restricted_member: { user_id: OTHER, role: 'member', is_restricted: true, can_publish: false, viewer_key: `user:${OTHER}` },
  author: { user_id: AUTHOR, role: 'member', is_restricted: false, can_publish: true, viewer_key: `user:${AUTHOR}` },
  admin: { user_id: OTHER, role: 'admin', is_restricted: false, can_publish: true, viewer_key: `user:${OTHER}` },
  superadmin: { user_id: OTHER, role: 'superadmin', is_restricted: false, can_publish: true, viewer_key: `user:${OTHER}` },
} satisfies Record<string, ServiceContext>

type ViewerName = keyof typeof viewers

// Ожидание из таблицы data-model.md: кто читает статью в каждом состоянии.
const ALL: ViewerName[] = ['guest', 'member', 'restricted_member', 'author', 'admin', 'superadmin']
const SIGNED_IN: ViewerName[] = ['member', 'restricted_member', 'author', 'admin', 'superadmin']
const AUTHOR_AND_ADMINS: ViewerName[] = ['author', 'admin', 'superadmin']

const expected: { status: ArticleAccessFields['status']; visibility: ArticleAccessFields['visibility']; readers: ViewerName[] }[] = [
  { status: 'published', visibility: 'public', readers: ALL },
  { status: 'published', visibility: 'members', readers: SIGNED_IN },
  { status: 'published', visibility: 'author', readers: AUTHOR_AND_ADMINS },
  { status: 'draft', visibility: 'public', readers: ['author'] },
  { status: 'draft', visibility: 'members', readers: ['author'] },
  { status: 'draft', visibility: 'author', readers: ['author'] },
  { status: 'hidden', visibility: 'public', readers: AUTHOR_AND_ADMINS },
  { status: 'hidden', visibility: 'members', readers: AUTHOR_AND_ADMINS },
  { status: 'hidden', visibility: 'author', readers: AUTHOR_AND_ADMINS },
  { status: 'deleted', visibility: 'public', readers: [] },
  { status: 'deleted', visibility: 'members', readers: [] },
  { status: 'deleted', visibility: 'author', readers: [] },
]

describe('content: canRead — все сочетания состояния, доступа и зрителя', () => {
  for (const { status, visibility, readers } of expected) {
    for (const name of Object.keys(viewers) as ViewerName[]) {
      const allowed = readers.includes(name)
      it(`${status}/${visibility}: ${name} ${allowed ? 'читает' : 'не читает'}`, () => {
        expect(canRead(viewers[name], { author_id: AUTHOR, visibility, status })).toBe(allowed)
      })
    }
  }
})

describe('content: getAccess', () => {
  const article: ArticleAccessFields = { author_id: AUTHOR, visibility: 'members', status: 'published' }
  const service = createAccessService({ findArticle: async (id) => (id === 'known' ? article : null) })

  it('отдаёт решение и поля, по которым оно принято', async () => {
    expect(await service.getAccess(viewers.guest, 'known')).toEqual({ can_read: false, visibility: 'members', status: 'published', author_id: AUTHOR })
    expect(await service.getAccess(viewers.member, 'known')).toMatchObject({ can_read: true })
  })

  it('несуществующая статья — NotFound', async () => {
    await expect(service.getAccess(viewers.member, 'missing')).rejects.toMatchObject({ http_status: 404, code: 'not_found' })
  })
})
