import preview from '#.storybook/preview'
import { ReactionGlyph } from './ReactionGlyph.tsx'

function Frame() {
  return (
    <div className="flex gap-4 p-4">
      <ReactionGlyph
        appearance={{
          kind: 'heart',
          label: 'Нравится',
          status: 'active',
          presentation: 'emoji',
          emoji: '❤️',
        }}
        label="Нравится"
      />
      <ReactionGlyph
        appearance={{
          kind: 'fire',
          label: 'Огонь',
          status: 'active',
          presentation: 'emoji',
          emoji: '🔥',
        }}
        label="Огонь"
        size="lg"
      />
    </div>
  )
}

const meta = preview.meta({ title: 'entities/reaction/ReactionGlyph', component: Frame })
export const Emoji = meta.story({})
