import type { Meta, StoryObj } from '@storybook/react-vite'
import { http, HttpResponse } from 'msw'
import { StoryProviders } from '@/shared/api/mocks'
import { PageList } from './PageList.tsx'
const meta = {
  title: 'features/manage-pages/PageList',
  component: PageList,
  decorators: [
    (Story) => (
      <StoryProviders route="/admin/pages">
        <Story />
      </StoryProviders>
    ),
  ],
} satisfies Meta<typeof PageList>
export default meta
type Story = StoryObj<typeof PageList>
export const Empty: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get('*/v1/admin/pages', () => HttpResponse.json({ items: [], next_cursor: null })),
      ],
    },
  },
}
export const Loading: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get('*/v1/admin/pages', async () => {
          await new Promise(() => {})
          return HttpResponse.json({ items: [], next_cursor: null })
        }),
      ],
    },
  },
}
export const Error: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get('*/v1/admin/pages', () =>
          HttpResponse.json({ code: 'internal' }, { status: 500 }),
        ),
      ],
    },
  },
}
