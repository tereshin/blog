import preview from '#.storybook/preview'
import { HttpResponse, delay, http } from 'msw'
import { expect, within } from 'storybook/test'
import topics from '@/shared/api/mocks/fixtures/topics.json'
import { StoryProviders } from '@/shared/lib'
import { LeftNav } from './LeftNav.tsx'

const meta = preview.meta({
  title: 'widgets/shell/LeftNav',
  component: LeftNav,
  decorators: [
    (Story, context) => (
      <StoryProviders route={String(context.parameters['route'] ?? '/')}>
        <div className="h-[32rem] w-[220px] bg-background">
          <Story />
        </div>
      </StoryProviders>
    ),
  ],
})
/** Список на фоне страницы, ширина столбца 220px, без карточки-подложки. */
export const Loaded = meta.story({
  parameters: { msw: { handlers: [http.get('*/v1/topics', () => HttpResponse.json(topics))] } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await canvas.findByRole('link', { name: 'Свежее' })
    expect(canvasElement.querySelector('.rounded-card')).toBeNull()
    expect(canvasElement.innerHTML).not.toContain('1200')
    expect(canvasElement.querySelector('.w-\\[220px\\]')).not.toBeNull()
  },
})
export const TopicSelected = meta.story({
  parameters: { route: '/t/dizajn', msw: { handlers: [http.get('*/v1/topics', () => HttpResponse.json(topics))] } },
})
export const Loading = meta.story({
  parameters: { msw: { handlers: [http.get('*/v1/topics', async () => { await delay('infinite'); return HttpResponse.json([]) })] } },
})
export const Error = meta.story({ parameters: { msw: { handlers: [http.get('*/v1/topics', () => new HttpResponse(null, { status: 500 }))] } } })
export const Empty = meta.story({ parameters: { msw: { handlers: [http.get('*/v1/topics', () => HttpResponse.json([]))] } } })
export const UnreadMessages = meta.story({
  args: { has_unread_messages: true },
  parameters: { msw: { handlers: [http.get('*/v1/topics', () => HttpResponse.json(topics))] } },
})
