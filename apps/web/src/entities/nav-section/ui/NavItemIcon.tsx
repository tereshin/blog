import { SvgIcon } from '@/shared/ui'
import { cn } from '@/shared/lib'

type NavItemIconProps = {
  svg: string
  size: 20 | 24
}

/** Иконка пункта секции. */
export function NavItemIcon({ svg, size }: NavItemIconProps) {
  return <SvgIcon svg={svg} className={cn('text-current', size === 20 ? 'size-5' : 'size-6')} />
}
