import preview from '#.storybook/preview'
import { expect, within } from 'storybook/test'
import { StoryProviders } from '@/shared/lib'
import { LeftNav } from './LeftNav.tsx'
import { RightRail } from './RightRail.tsx'
import { Shell } from './Shell.tsx'
import { SiteHeader } from './SiteHeader.tsx'

function Notifications() {
  return (
    <button type="button" aria-label="Уведомления">
      Уведомления
    </button>
  )
}

const meta = preview.meta({
  title: 'widgets/shell/SiteHeader',
  component: SiteHeader,
  decorators: [
    (Story) => (
      <StoryProviders>
        <div className="w-[1440px] bg-background">
          <Story />
        </div>
      </StoryProviders>
    ),
  ],
})
/** Широкая шапка: поиск стоит сразу перед уведомлениями, боковой панели нет. */
export const Wide = meta.story({
  args: { notifications: <Notifications /> },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const search = await canvas.findByRole('button', { name: 'Поиск' })
    const notes = await canvas.findByRole('button', { name: 'Уведомления' })
    expect(search.nextElementSibling).toBe(notes)
    expect(canvasElement.querySelector('[aria-label="Открыть навигацию"]')).toBeNull()
  },
})

/** Три зоны широкой полосы: шапка, левый список без карточки, правая стопка с «Популярные комментарии». */
export const WideLayout = meta.story({
  args: { notifications: <Notifications /> },
  render: () => (
    <StoryProviders>
      <div className="w-[1440px] bg-background">
        <Shell
          header={<SiteHeader notifications={<Notifications />} />}
          left={<LeftNav />}
          center={<p className="px-4 py-4">Центр раздела</p>}
          right={<RightRail />}
        />
      </div>
    </StoryProviders>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const grid = canvasElement.querySelector('header')?.nextElementSibling
    const grid_class = grid?.className ?? ''
    expect(grid_class).toContain('shell-grid')
    const search = await canvas.findByRole('button', { name: 'Поиск' })
    expect(search.nextElementSibling?.getAttribute('aria-label')).toBe('Уведомления')
    expect(canvasElement.querySelector('nav .rounded-card')).toBeNull()
    await canvas.findByText('Популярные комментарии')
    expect(canvasElement.textContent).not.toContain('Подписка Plus')
  },
})

export const Expanded = meta.story({ args: { content_width: 848 } })
