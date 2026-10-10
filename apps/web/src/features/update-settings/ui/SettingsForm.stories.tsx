import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, within } from 'storybook/test'
import { DEFAULT_REACTION_APPEARANCES } from '@blog/contracts'
import { StoryProviders } from '@/shared/api/mocks'
import type { AdminSettings } from '../api/update-settings.ts'
import { SettingsForm } from './SettingsForm.tsx'

const initial: AdminSettings = {
  name: 'Блог',
  logo_url: null,
  locale: 'ru',
  about: 'О проекте',
  registration_open: true,
  new_members_can_publish: true,
  reaction_appearances: DEFAULT_REACTION_APPEARANCES,
  profile_status_icons: [],
}

function upload({ label, onUploaded }: { label: string; onUploaded: (url: string) => void }) {
  return (
    <button type="button" onClick={() => onUploaded('https://media.test/image.png')}>
      {label}
    </button>
  )
}

const meta = {
  title: 'features/update-settings/SettingsForm',
  component: SettingsForm,
  args: { initial, upload, can_edit_media: true },
  decorators: [
    (Story) => (
      <StoryProviders>
        <div className="mx-auto max-w-xl p-4">
          <Story />
        </div>
      </StoryProviders>
    ),
  ],
} satisfies Meta<typeof SettingsForm>
export default meta
type Story = StoryObj<typeof meta>

/** Суперадминистратор видит четыре реакции и может их менять — так же, как логотип. */
export const Superadmin: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await canvas.findByText('Виды реакций')
    for (const name of ['Смех', 'Сердце', 'Палец вверх', 'Огонь']) {
      expect(await canvas.findByRole('textbox', { name })).toBeEnabled()
    }
    expect(canvas.getByRole('button', { name: 'Логотип' })).toBeEnabled()
  },
}

/** Администратор без роли суперадминистратора не меняет ни логотип, ни вид реакций. */
export const Admin: Story = {
  args: { can_edit_media: false },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await canvas.findByText('Виды реакций')
    for (const name of ['Смех', 'Сердце', 'Палец вверх', 'Огонь']) {
      expect(await canvas.findByRole('textbox', { name })).toBeDisabled()
    }
    expect(canvas.getByRole('button', { name: 'Логотип' })).toBeDisabled()
  },
}
