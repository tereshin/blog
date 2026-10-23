import type { ReactionAppearance } from '@blog/contracts'
import type { CSSProperties } from 'react'
import { ReactionGlyph } from '@/entities/reaction'
import './reaction-burst.css'

const PARTICLES = [
  { x: -58, y: -116, rotate: -24, delay: 0, size: 1 },
  { x: 18, y: -176, rotate: 16, delay: 65, size: 1.15 },
  { x: 76, y: -108, rotate: 32, delay: 125, size: .85 },
  { x: -20, y: -146, rotate: -12, delay: 195, size: .7 },
]

type ReactionBurstProps = { appearance: ReactionAppearance; onComplete: () => void }

export function ReactionBurst({ appearance, onComplete }: ReactionBurstProps) {
  return (
    <span className="reaction-burst" aria-hidden="true">
      {PARTICLES.map((particle, offset) => (
        <span
          key={particle.delay}
          className="reaction-burst__particle"
          style={{
            '--burst-x': `${particle.x}px`,
            '--burst-y': `${particle.y}px`,
            '--burst-rotate': `${particle.rotate}deg`,
            '--burst-delay': `${particle.delay}ms`,
            '--burst-size': particle.size,
          } as CSSProperties}
          onAnimationEnd={offset === PARTICLES.length - 1 ? onComplete : undefined}
        >
          <ReactionGlyph appearance={appearance} label={appearance.label} size="lg" />
        </span>
      ))}
    </span>
  )
}
