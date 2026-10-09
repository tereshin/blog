import type { Meta, StoryObj } from '@storybook/react-vite'
import { HttpResponse, delay, http } from 'msw'
import { expect, within } from 'storybook/test'
import comments from '@/shared/api/mocks/fixtures/popular-comments.json'
import { StoryProviders } from '@/shared/api/mocks'
import { RightRail } from './RightRail.tsx'

const meta = {
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
} satisfies Meta<typeof RightRail>
export default meta
type Story = StoryObj<typeof meta>

/** Стопка скруглённых карточек шириной 320. Обязательная карточка — «Популярные комментарии». */
export const Loaded: Story = {
  parameters: { msw: { handlers: [http.get('*/v1/comments/popular', () => HttpResponse.json(comments))] } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await canvas.findByRole('region', { name: 'Популярные комментарии' })
    expect(canvasElement.querySelector('.w-\\[320px\\] .rounded-card')).not.toBeNull()
    expect(canvasElement.innerHTML).not.toContain('1200')
    expect(canvasElement.textContent).not.toContain('Подписка Plus')
  },
}
export const Loading: Story = {
  parameters: { msw: { handlers: [http.get('*/v1/comments/popular', async () => { await delay('infinite'); return HttpResponse.json([]) })] } },
}
export const Empty: Story = {
  parameters: { msw: { handlers: [http.get('*/v1/comments/popular', () => HttpResponse.json([]))] } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await canvas.findByText('Пока нечего показать')
    expect(canvasElement.querySelector('.w-\\[320px\\]')).not.toBeNull()
  },
}
export const Error: Story = { parameters: { msw: { handlers: [http.get('*/v1/comments/popular', () => new HttpResponse(null, { status: 500 }))] } } }
