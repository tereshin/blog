import preview from '#.storybook/preview'
import { MemoryRouter } from 'react-router'
import { NotificationItem } from './NotificationItem.tsx'

const item = {
  id: 'n1',
  kind: 'comment' as const,
  article_id: 'a1',
  article_slug: 'kursornaya-paginatsiya',
  article_title: 'Курсорная пагинация',
  comment_id: 'c1',
  conversation_id: null,
  actor: { display_name: 'Борис Писарев', avatar_url: null },
  read_at: null,
  created_at: '2026-10-08T12:00:00.000Z',
  href: '/p/kursornaya-paginatsiya#comment-c1',
}

function Frame({ read }: { read: boolean }) {
  return (
    <MemoryRouter>
      <div className="max-w-md p-4">
        <NotificationItem item={{ ...item, read_at: read ? item.created_at : null }} />
      </div>
    </MemoryRouter>
  )
}

const meta = preview.meta({ title: 'entities/notification/NotificationItem', component: Frame })
export const Unread = meta.story({ args: { read: false } })
export const Read = meta.story({ args: { read: true } })
