import type { Meta, StoryObj } from '@storybook/react-vite'
import { HttpResponse, delay, http } from 'msw'
import { StoryProviders } from '@/shared/api/mocks'
import { Feed } from './Feed.tsx'

const meta = {
  title: 'widgets/feed/Feed',
  component: Feed,
  args: { mode: 'fresh' },
  decorators: [
    (Story) => (
      <StoryProviders>
        <div className="mx-auto max-w-xl p-4">
          <Story />
        </div>
      </StoryProviders>
    ),
  ],
} satisfies Meta<typeof Feed>
export default meta
type Story = StoryObj<typeof meta>

const empty = { items: [], next_cursor: null }

export const Loading: Story = {
  parameters: { msw: { handlers: [http.get('*/v1/feed', async () => { await delay('infinite'); return HttpResponse.json(empty) })] } },
}
export const Empty: Story = {
  parameters: { msw: { handlers: [http.get('*/v1/feed', () => HttpResponse.json(empty))] } },
}
export const Error: Story = {
  parameters: { msw: { handlers: [http.get('*/v1/feed', () => new HttpResponse(null, { status: 500 }))] } },
}
