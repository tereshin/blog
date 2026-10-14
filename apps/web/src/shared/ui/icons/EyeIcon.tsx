import { BaseIcon } from '../BaseIcon.tsx'
import type { IconProps } from './icon-props.ts'

export function EyeIcon({ style, ...props }: IconProps) {
  return <BaseIcon name="eye" style="line" size={20} {...props} svg_style={style} />
}
