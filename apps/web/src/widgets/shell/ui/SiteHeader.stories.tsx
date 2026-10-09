import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, within } from 'storybook/test'
import { StoryProviders } from '@/shared/api/mocks'
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

const meta = {
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
} satisfies Meta<typeof SiteHeader>
export default meta
type Story = StoryObj<typeof meta>

/** Широкая шапка: поиск стоит сразу перед уведомлениями, меню спрятано от 768px. */
export const Wide: Story = {
  args: { notifications: <Notifications /> },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const search = await canvas.findByRole('button', { name: 'Поиск' })
    const notes = await canvas.findByRole('button', { name: 'Уведомления' })
    expect(search.nextElementSibling).toBe(notes)
    const menu = canvasElement.querySelector('[aria-label="Открыть навигацию"]')
    expect(menu?.className ?? '').toContain('min-[768px]:hidden')
    expect(menu?.className ?? '').not.toContain('1200')
  },
}

/** Три зоны широкой полосы: шапка, левый список без карточки, правая стопка с «Популярные комментарии». */
export const WideLayout: Story = {
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
    expect(grid_class).toContain('min-[1280px]:w-[1280px]')
    expect(grid_class).toContain('min-[1280px]:grid-cols-[220px_minmax(0,1fr)_320px]')
    expect(grid_class).toContain('min-[768px]:grid-cols-[220px_minmax(0,1fr)]')
    expect(grid_class).toContain('min-[768px]:gap-x-4')
    expect(grid_class).not.toContain('1200')
    const search = await canvas.findByRole('button', { name: 'Поиск' })
    expect(search.nextElementSibling?.getAttribute('aria-label')).toBe('Уведомления')
    expect(canvasElement.querySelector('nav .rounded-card')).toBeNull()
    await canvas.findByText('Популярные комментарии')
    expect(canvasElement.textContent).not.toContain('Подписка Plus')
  },
}
