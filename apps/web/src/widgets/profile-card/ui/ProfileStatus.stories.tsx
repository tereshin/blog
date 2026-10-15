import preview from '#.storybook/preview'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'
import { MemoryRouter } from 'react-router'
import { expect, userEvent, within } from 'storybook/test'
import { DEFAULT_REACTION_APPEARANCES, DEFAULT_SHELL_VISIBILITY } from '@blog/contracts'
import { settingsKeys } from '@/entities/settings'
import { profile } from '@/shared/api/mocks/fixtures/profile.ts'
import { ProfileStatus } from './ProfileStatus.tsx'

const icons = Array.from({ length: 25 }, (_, index) => ({
  id: `44444444-4444-4444-8444-${String(index + 1).padStart(12, '0')}`,
  label: `Статус ${index + 1}`,
  image_url: '/badges/one_year.svg',
}))
function Frame({ is_own = true, has_selected = false }: { is_own?: boolean; has_selected?: boolean }) {
  const [client] = useState(() => {
    const value = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity } } })
    value.setQueryData(settingsKeys.public(), {
      name: 'Блог', logo_url: null, locale: 'ru', reaction_appearances: DEFAULT_REACTION_APPEARANCES,
      profile_status_icons: icons, profile_badges: [], shell: DEFAULT_SHELL_VISIBILITY,
    })
    return value
  })
  return (
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/u/reader']}>
        <div className="flex items-center gap-2 p-10">
          <strong>{profile.display_name}</strong>
          <ProfileStatus profile={{ ...profile, is_own, status_icon_id: has_selected ? icons[0]?.id ?? null : null }} />
        </div>
      </MemoryRouter>
    </QueryClientProvider>
  )
}
const meta = preview.meta({ title: 'widgets/profile-card/ProfileStatus', component: Frame })
export const Empty = meta.story({})
export const Selected = meta.story({ args: { has_selected: true } })
export const Foreign = meta.story({ args: { is_own: false, has_selected: true } })
export const Grid = meta.story({
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Выбрать статус' }))
    await expect(within(document.body).getByRole('listbox', { name: 'Выбрать статус' })).toBeVisible()
    await expect(within(document.body).getAllByRole('option')).toHaveLength(26)
  },
})
