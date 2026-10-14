import { BaseIcon } from '../BaseIcon.tsx'
import type { IconProps } from './icon-props.ts'

export function ArrowUpIcon({ style, ...props }: IconProps) {
  return <BaseIcon name="arrow_up" style="line" size={20} {...props} svg_style={style} />
}
