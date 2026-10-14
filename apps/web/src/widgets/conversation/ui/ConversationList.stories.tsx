import type { Decorator } from '@storybook/react-vite'
import preview from '#.storybook/preview'
import { HttpResponse, delay, http } from 'msw'
import { StoryProviders } from '@/shared/lib'
import { ConversationList } from './ConversationList.tsx'

const member: Decorator = (Story) => {
  window.localStorage.setItem('mock_viewer', 'member')
  return (
    <StoryProviders route="/messages">
      <div className="h-96 w-80 p-4">
        <Story />
      </div>
    </StoryProviders>
  )
}

const meta = preview.meta({
  title: 'widgets/conversation/ConversationList',
  component: ConversationList,
  args: { selected_id: null },
  decorators: [member],
})
export const Loading = meta.story({
  parameters: { msw: { handlers: [http.get('*/v1/conversations', async () => { await delay('infinite'); return HttpResponse.json({ items: [], next_cursor: null }) })] } },
})
export const Empty = meta.story({
  parameters: { msw: { handlers: [http.get('*/v1/conversations', () => HttpResponse.json({ items: [], next_cursor: null }))] } },
})
export const Error = meta.story({
  parameters: { msw: { handlers: [http.get('*/v1/conversations', () => new HttpResponse(null, { status: 500 }))] } },
})
