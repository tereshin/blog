import preview from '#.storybook/preview'
import { MemoryRouter } from 'react-router'
import { TopicNavItem } from './TopicNavItem.tsx'

const topic = { id: 't1', title: 'Технологии', slug: 'tehnologii', avatar_url: null }

function Frame({ is_selected }: { is_selected: boolean }) {
  return (
    <MemoryRouter>
      <div className="max-w-xs p-4">
        <TopicNavItem topic={topic} is_selected={is_selected} />
      </div>
    </MemoryRouter>
  )
}

const meta = preview.meta({ title: 'entities/topic/TopicNavItem', component: Frame })
export const Idle = meta.story({ args: { is_selected: false } })
export const Selected = meta.story({ args: { is_selected: true } })
