import { BaseIcon } from '../BaseIcon.tsx'
import type { IconProps } from './icon-props.ts'

export function MoreIcon({ style, ...props }: IconProps) {
  return <BaseIcon name="more_1" style="line" size={20} {...props} svg_style={style} />
}
