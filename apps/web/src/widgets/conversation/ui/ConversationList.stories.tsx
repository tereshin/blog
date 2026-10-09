import type { Decorator, Meta, StoryObj } from '@storybook/react-vite'
import { HttpResponse, delay, http } from 'msw'
import { StoryProviders } from '@/shared/api/mocks'
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

const meta = {
  title: 'widgets/conversation/ConversationList',
  component: ConversationList,
  args: { selected_id: null },
  decorators: [member],
} satisfies Meta<typeof ConversationList>
export default meta
type Story = StoryObj<typeof meta>

export const Loading: Story = {
  parameters: { msw: { handlers: [http.get('*/v1/conversations', async () => { await delay('infinite'); return HttpResponse.json({ items: [], next_cursor: null }) })] } },
}
export const Empty: Story = {
  parameters: { msw: { handlers: [http.get('*/v1/conversations', () => HttpResponse.json({ items: [], next_cursor: null }))] } },
}
export const Error: Story = {
  parameters: { msw: { handlers: [http.get('*/v1/conversations', () => new HttpResponse(null, { status: 500 }))] } },
}
