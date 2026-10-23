import preview from '#.storybook/preview'
import { useState } from 'react'
import { AnimatedCount } from './AnimatedCount.tsx'
import { Button } from './Button.tsx'

function Frame({ initial = 9 }: { initial?: number }) {
  const [value, setValue] = useState(initial)
  return (
    <div className="flex items-center gap-4 p-8">
      <Button onPress={() => setValue((current) => Math.max(0, current - 1))}>−</Button>
      <AnimatedCount value={value} className="text-2xl" />
      <Button onPress={() => setValue((current) => current + 1)}>+</Button>
    </div>
  )
}

const meta = preview.meta({ title: 'shared/ui/AnimatedCount', component: Frame })
export const Units = meta.story({ args: { initial: 9 } })
export const Carry = meta.story({ args: { initial: 99 } })
export const Compact = meta.story({ args: { initial: 999 } })
export const Zero = meta.story({ args: { initial: 0 } })
