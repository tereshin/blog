import { BaseIcon } from '../BaseIcon.tsx'
import type { IconProps } from './icon-props.ts'

export function ShareIcon({ style, ...props }: IconProps) {
  return <BaseIcon name="forward_2" style="line" size={20} {...props} svg_style={style} />
}
