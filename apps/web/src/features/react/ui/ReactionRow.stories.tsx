import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent, waitFor, within } from 'storybook/test'
import { DEFAULT_REACTION_APPEARANCES } from '@blog/contracts'
import type { ReactionAppearances } from '@blog/contracts'
import type { ReactionCounts, ReactionKind } from '@/entities/reaction'
import { ReactionRow } from './ReactionRow.tsx'

const empty: ReactionCounts = { laugh: 0, heart: 0, thumb: 0, fire: 0 }
const some: ReactionCounts = { laugh: 3, heart: 12, thumb: 0, fire: 1 }
const image_url = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
const broken_url = 'data:image/png;base64,not-an-image'

const picker_appearances: ReactionAppearances = ([
  ['heart', 'Сердце', '❤️'],
  ['fire', 'Огонь', '🔥'],
  ['cool', 'Круто', '😎'],
  ['laugh', 'Смех', '😂'],
  ['shock', 'Шок', '😱'],
  ['tear', 'Слеза', '🥲'],
  ['angry', 'Злость', '😡'],
  ['popcorn', 'Попкорн', '🍿'],
  ['eyes', 'Глаза', '👀'],
  ['money', 'Деньги', '💵'],
  ['star', 'Звезда', '⭐'],
  ['medal', 'Медаль', '🥇'],
  ['clap', 'Аплодисменты', '👏'],
  ['diamond', 'Алмаз', '💎'],
  ['trophy', 'Кубок', '🏆'],
  ['clown', 'Клоун', '🤡'],
  ['poop', 'Какашка', '💩'],
  ['radiation', 'Радиация', '☢️'],
  ['sausage', 'Хот-дог', '🌭'],
  ['frog', 'Лягушка', '🐸'],
] as const).map(([kind, label, emoji]) => ({
  kind, label, emoji, status: 'active', presentation: 'emoji',
}))

const images: ReactionAppearances = [
  { kind: 'laugh', label: 'Смех', status: 'active', presentation: 'image', image_url },
  { kind: 'heart', label: 'Сердце', status: 'active', presentation: 'image', image_url },
  { kind: 'thumb', label: 'Палец вверх', status: 'active', presentation: 'image', image_url },
  { kind: 'fire', label: 'Огонь', status: 'active', presentation: 'image', image_url },
]

const broken: ReactionAppearances = [
  { kind: 'laugh', label: 'Смех', status: 'active', presentation: 'image', image_url: broken_url },
  { kind: 'heart', label: 'Сердце', status: 'active', presentation: 'image', image_url: broken_url },
  { kind: 'thumb', label: 'Палец вверх', status: 'active', presentation: 'image', image_url: broken_url },
  { kind: 'fire', label: 'Огонь', status: 'active', presentation: 'image', image_url: broken_url },
]

function Row({
  counts,
  my_reaction,
  appearances,
}: {
  counts: ReactionCounts
  my_reaction: ReactionKind | null
  appearances?: ReactionAppearances
}) {
  const [mine, setMine] = useState(my_reaction)
  return (
    <div className="p-4">
      <ReactionRow
        counts={counts}
        my_reaction={mine}
        onSelect={(kind) => setMine((current) => (current === kind ? null : kind))}
        {...(appearances ? { appearances } : {})}
      />
    </div>
  )
}

const meta = { title: 'features/react/ReactionRow', component: Row } satisfies Meta<typeof Row>
export default meta
type Story = StoryObj<typeof Row>

export const None: Story = { args: { counts: empty, my_reaction: null } }
export const Some: Story = { args: { counts: some, my_reaction: null } }
export const Mine: Story = { args: { counts: some, my_reaction: 'heart' } }
export const Guest: Story = { args: { counts: some, my_reaction: null } }
export const Emoji: Story = { args: { counts: some, my_reaction: null, appearances: DEFAULT_REACTION_APPEARANCES } }
export const Image: Story = { args: { counts: some, my_reaction: 'heart', appearances: images } }
/** Полный каталог: пять колонок, четвёртый ряд доступен прокруткой. */
export const Picker: Story = {
  args: { counts: { heart: 1 }, my_reaction: null, appearances: picker_appearances },
  globals: { theme: 'light' },
  decorators: [(Story) => <div className="pl-[50px] pt-[184px]"><Story /></div>],
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Добавить реакцию' }))
    const body = within(canvasElement.ownerDocument.body)
    await waitFor(() => expect(body.getByRole('listbox')).toBeVisible())
    await waitFor(() => expect(body.getAllByRole('option')).toHaveLength(20))
    await userEvent.click(body.getByRole('option', { name: 'Огонь' }))
    const canvas = within(canvasElement)
    await expect(canvas.getByRole('button', { name: 'Огонь' })).toHaveAttribute('aria-pressed', 'true')
    await userEvent.click(canvas.getByRole('button', { name: 'Добавить реакцию' }))
    await userEvent.click(await body.findByRole('option', { name: 'Огонь' }))
    await expect(canvas.queryByRole('button', { name: 'Огонь' })).not.toBeInTheDocument()
    await userEvent.click(canvas.getByRole('button', { name: 'Добавить реакцию' }))
    const first = await body.findByRole('option', { name: 'Сердце' })
    first.focus()
    await userEvent.keyboard('{End}{Enter}')
    const frog = await canvas.findByRole('button', { name: 'Лягушка' })
    await expect(frog).toHaveAttribute('aria-pressed', 'true')
    await userEvent.click(frog)
    await userEvent.click(canvas.getByRole('button', { name: 'Добавить реакцию' }))
    await waitFor(() => expect(body.getByRole('listbox')).toBeVisible())
  },
}
/** Несработавшая картинка показывает текстовое имя, кнопка ставит и снимает реакцию. */
export const BrokenImage: Story = {
  args: { counts: some, my_reaction: null, appearances: broken },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const laugh = await canvas.findByRole('button', { name: /Смех/ })
    await within(laugh).findByText('Смех')
    await userEvent.click(laugh)
    await expect(laugh).toHaveAttribute('aria-pressed', 'true')
    await userEvent.click(laugh)
    await expect(laugh).toHaveAttribute('aria-pressed', 'false')
  },
}
