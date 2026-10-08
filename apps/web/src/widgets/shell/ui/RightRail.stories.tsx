import type { Meta, StoryObj } from '@storybook/react-vite'
import { HttpResponse, delay, http } from 'msw'
import comments from '@/shared/api/mocks/fixtures/popular-comments.json'
import { StoryProviders } from '@/shared/api/mocks'
import { RightRail } from './RightRail.tsx'

const meta = {
  title: 'widgets/shell/RightRail',
  component: RightRail,
  decorators: [
    (Story) => (
      <StoryProviders>
        <div className="flex h-[32rem] w-[21rem] flex-col p-4">
          <Story />
        </div>
      </StoryProviders>
    ),
  ],
} satisfies Meta<typeof RightRail>
export default meta
type Story = StoryObj<typeof meta>

export const Loaded: Story = { parameters: { msw: { handlers: [http.get('*/v1/comments/popular', () => HttpResponse.json(comments))] } } }
export const Loading: Story = {
  parameters: { msw: { handlers: [http.get('*/v1/comments/popular', async () => { await delay('infinite'); return HttpResponse.json([]) })] } },
}
export const Empty: Story = { parameters: { msw: { handlers: [http.get('*/v1/comments/popular', () => HttpResponse.json([]))] } } }
export const Error: Story = { parameters: { msw: { handlers: [http.get('*/v1/comments/popular', () => new HttpResponse(null, { status: 500 }))] } } }
