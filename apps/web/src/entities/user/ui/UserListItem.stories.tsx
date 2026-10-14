import preview from '#.storybook/preview'
import { MemoryRouter } from 'react-router'
import { UserListItem } from './UserListItem.tsx'

function Frame() {
  return (
    <MemoryRouter>
      <div className="max-w-sm p-4">
        <UserListItem
          user={{
            user_id: 'a1000000-0000-4000-8000-000000000001',
            display_name: 'Анна Авторова',
            avatar_url: null,
            slug: 'anna',
            reputation: 42,
            href: '/u/anna',
          }}
        />
      </div>
    </MemoryRouter>
  )
}

const meta = preview.meta({ title: 'entities/user/UserListItem', component: Frame })
export const Default = meta.story({})
