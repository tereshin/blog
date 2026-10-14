import { BaseIcon } from '../BaseIcon.tsx'
import type { IconProps } from './icon-props.ts'

export function SearchIcon({ style, ...props }: IconProps) {
  return <BaseIcon name="search_2" style="line" size={20} {...props} svg_style={style} />
}
