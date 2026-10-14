import { cva } from 'class-variance-authority'
import { SvgIcon } from '@/shared/ui'
import { cn } from '@/shared/lib'

type NavItemIconProps = {
  svg: string
  size: 20 | 24
}

const icon_size = cva('text-current', {
  variants: {
    size: {
      20: 'size-5',
      24: 'size-6',
    },
  },
})

/** Иконка пункта секции. */
export function NavItemIcon({ svg, size }: NavItemIconProps) {
  return <SvgIcon svg={svg} className={cn(icon_size({ size }))} />
}
