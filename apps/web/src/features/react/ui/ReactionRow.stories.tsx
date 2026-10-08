import type { Meta, StoryObj } from '@storybook/react-vite'
import type { ReactionCounts, ReactionKind } from '@/entities/reaction'
import { ReactionRow } from './ReactionRow.tsx'

const empty: ReactionCounts = { laugh: 0, heart: 0, thumb: 0, fire: 0 }
const some: ReactionCounts = { laugh: 3, heart: 12, thumb: 0, fire: 1 }

function Row({ counts, my_reaction }: { counts: ReactionCounts; my_reaction: ReactionKind | null }) {
  return (
    <div className="p-4">
      <ReactionRow counts={counts} my_reaction={my_reaction} onSelect={() => undefined} />
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
