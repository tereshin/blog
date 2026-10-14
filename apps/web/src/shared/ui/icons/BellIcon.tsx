import { BaseIcon } from '../BaseIcon.tsx'
import type { IconProps } from './icon-props.ts'

export function BellIcon({ style, ...props }: IconProps) {
  return <BaseIcon name="notification" style="line" size={20} {...props} svg_style={style} />
}
