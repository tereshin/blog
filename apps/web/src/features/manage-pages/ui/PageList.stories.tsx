import preview from '#.storybook/preview'
import { http, HttpResponse } from 'msw'
import { StoryProviders } from '@/shared/lib'
import { PageList } from './PageList.tsx'
const meta = preview.meta({
  title: 'features/manage-pages/PageList',
  component: PageList,
  decorators: [
    (Story) => (
      <StoryProviders route="/admin/pages">
        <Story />
      </StoryProviders>
    ),
  ],
})
export const Empty = meta.story({
  parameters: {
    msw: {
      handlers: [
        http.get('*/v1/admin/pages', () => HttpResponse.json({ items: [], next_cursor: null })),
      ],
    },
  },
})
export const Loading = meta.story({
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
})
export const Error = meta.story({
  parameters: {
    msw: {
      handlers: [
        http.get('*/v1/admin/pages', () =>
          HttpResponse.json({ code: 'internal' }, { status: 500 }),
        ),
      ],
    },
  },
})
