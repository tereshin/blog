import { BaseIcon } from '../BaseIcon.tsx'
import type { IconProps } from './icon-props.ts'

export function ChevronDownIcon({ style, ...props }: IconProps) {
  return <BaseIcon name="down" style="line" size={20} {...props} svg_style={style} />
}
