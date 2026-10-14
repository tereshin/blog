import preview from '#.storybook/preview'
import { HttpResponse, delay, http } from 'msw'
import { StoryProviders } from '@/shared/lib'
import { Feed } from './Feed.tsx'

const meta = preview.meta({
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
})
const empty = { items: [], next_cursor: null }

export const Loading = meta.story({
  args: { mode: 'fresh' },
  parameters: { msw: { handlers: [http.get('*/v1/feed', async () => { await delay('infinite'); return HttpResponse.json(empty) })] } },
})
export const Empty = meta.story({
  args: { mode: 'fresh' },
  parameters: { msw: { handlers: [http.get('*/v1/feed', () => HttpResponse.json(empty))] } },
})
export const Error = meta.story({
  args: { mode: 'fresh' },
  parameters: { msw: { handlers: [http.get('*/v1/feed', () => new HttpResponse(null, { status: 500 }))] } },
})
