import preview from '#.storybook/preview'
import { HttpResponse, delay, http } from 'msw'
import { expect, within } from 'storybook/test'
import comments from '@/shared/api/mocks/fixtures/popular-comments.json'
import { StoryProviders } from '@/shared/lib'
import { RightRail } from './RightRail.tsx'

const meta = preview.meta({
  title: 'widgets/shell/RightRail',
  component: RightRail,
  decorators: [
    (Story) => (
      <StoryProviders>
        <div className="flex h-[32rem] w-[320px] flex-col bg-background">
          <Story />
        </div>
      </StoryProviders>
    ),
  ],
})
/** Стопка скруглённых карточек шириной 320. Обязательная карточка — «Популярные комментарии». */
export const Loaded = meta.story({
  parameters: { msw: { handlers: [http.get('*/v1/comments/popular', () => HttpResponse.json(comments))] } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await canvas.findByRole('region', { name: 'Популярные комментарии' })
    await canvas.findAllByRole('listitem')
    expect(canvas.getAllByRole('listitem')).toHaveLength(2)
    expect(canvasElement.querySelector('.w-\\[320px\\] .card')).not.toBeNull()
    expect(canvasElement.innerHTML).not.toContain('1200')
    expect(canvasElement.textContent).not.toContain('Подписка Plus')
  },
})
export const Loading = meta.story({
  parameters: { msw: { handlers: [http.get('*/v1/comments/popular', async () => { await delay('infinite'); return HttpResponse.json([]) })] } },
})
export const Empty = meta.story({
  parameters: { msw: { handlers: [http.get('*/v1/comments/popular', () => HttpResponse.json([]))] } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await canvas.findByText('Пока нечего показать')
    expect(canvasElement.querySelector('.w-\\[320px\\]')).not.toBeNull()
  },
})
export const Error = meta.story({ parameters: { msw: { handlers: [http.get('*/v1/comments/popular', () => new HttpResponse(null, { status: 500 }))] } } })
