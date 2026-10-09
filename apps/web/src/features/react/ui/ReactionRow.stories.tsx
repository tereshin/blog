import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent, within } from 'storybook/test'
import { DEFAULT_REACTION_APPEARANCES } from '@blog/contracts'
import type { ReactionAppearances } from '@blog/contracts'
import type { ReactionCounts, ReactionKind } from '@/entities/reaction'
import { ReactionRow } from './ReactionRow.tsx'

const empty: ReactionCounts = { laugh: 0, heart: 0, thumb: 0, fire: 0 }
const some: ReactionCounts = { laugh: 3, heart: 12, thumb: 0, fire: 1 }
const image_url = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
const broken_url = 'data:image/png;base64,not-an-image'

const images: ReactionAppearances = [
  { kind: 'laugh', presentation: 'image', image_url },
  { kind: 'heart', presentation: 'image', image_url },
  { kind: 'thumb', presentation: 'image', image_url },
  { kind: 'fire', presentation: 'image', image_url },
]

const broken: ReactionAppearances = [
  { kind: 'laugh', presentation: 'image', image_url: broken_url },
  { kind: 'heart', presentation: 'image', image_url: broken_url },
  { kind: 'thumb', presentation: 'image', image_url: broken_url },
  { kind: 'fire', presentation: 'image', image_url: broken_url },
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
