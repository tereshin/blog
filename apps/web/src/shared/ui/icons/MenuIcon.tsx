import { BaseIcon } from '../BaseIcon.tsx'
import type { IconProps } from './icon-props.ts'

export function MenuIcon({ style, ...props }: IconProps) {
  return <BaseIcon name="menu" style="line" size={20} {...props} svg_style={style} />
}
