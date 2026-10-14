import preview from '#.storybook/preview'
import { PROFILE_BADGES_FIXTURE } from '@/shared/api/mocks/fixtures/profile-badges'
import { expect, within } from 'storybook/test'
import { DEFAULT_REACTION_APPEARANCES, DEFAULT_SHELL_VISIBILITY } from '@blog/contracts'
import { StoryProviders } from '@/shared/lib'
import type { AdminSettings } from '../api/update-settings.ts'
import type { SettingsSection } from '../model/settings-sections.ts'
import { SettingsForm } from './SettingsForm.tsx'

const initial: AdminSettings = {
  name: 'Блог',
  logo_url: null,
  locale: 'ru',
  registration_open: true,
  new_members_can_publish: true,
  reaction_appearances: DEFAULT_REACTION_APPEARANCES,
  profile_status_icons: [],
  profile_badges: PROFILE_BADGES_FIXTURE,
  shell: DEFAULT_SHELL_VISIBILITY,
}

function upload({ label, onUploaded }: { label: string; onUploaded: (url: string) => void }) {
  return (
    <button type="button" onClick={() => onUploaded('https://media.test/image.png')}>
      {label}
    </button>
  )
}

const defaults = { initial, upload, can_edit_media: true, section: 'reactions' as SettingsSection }

const meta = preview.meta({
  title: 'features/update-settings/SettingsForm',
  component: SettingsForm,
  args: defaults,
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
/** Суперадминистратор видит четыре реакции и может их менять — так же, как логотип. */
export const Superadmin = meta.story({
  args: defaults,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await canvas.findByText('Виды реакций')
    for (const name of ['Смех', 'Сердце', 'Палец вверх', 'Огонь']) {
      expect(await canvas.findByRole('textbox', { name })).toBeEnabled()
    }
  },
})

/** Администратор без роли суперадминистратора не меняет ни логотип, ни вид реакций. */
export const Admin = meta.story({
  args: { ...defaults, can_edit_media: false },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await canvas.findByText('Виды реакций')
    for (const name of ['Смех', 'Сердце', 'Палец вверх', 'Огонь']) {
      expect(await canvas.findByRole('textbox', { name })).toBeDisabled()
    }
  },
})

export const General = meta.story({ args: { ...defaults, section: 'general' } })
export const Access = meta.story({ args: { ...defaults, section: 'access' } })
export const StatusIcons = meta.story({ args: { ...defaults, section: 'status-icons' } })
export const Seo = meta.story({ args: { ...defaults, section: 'seo' } })
export const Publisher = meta.story({ args: { ...defaults, section: 'publisher' } })
export const Covers = meta.story({ args: { ...defaults, section: 'covers' } })

export const Badges = meta.story({ args: { ...defaults, section: 'badges' } })
export const ArchivedBadge = meta.story({
  args: {
    ...defaults,
    section: 'badges',
    initial: { ...initial, profile_badges: initial.profile_badges.map((badge) => ({ ...badge, status: 'archived' })) },
  },
})
