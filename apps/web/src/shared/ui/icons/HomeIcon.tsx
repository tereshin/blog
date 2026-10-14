import { BaseIcon } from '../BaseIcon.tsx'
import type { IconProps } from './icon-props.ts'

export function HomeIcon({ style, icon_style = 'line', ...props }: IconProps & { icon_style?: 'line' | 'fill' }) {
  return (
    <BaseIcon name="home_4" style={icon_style} size={20} {...props} svg_style={style} />
  )
}
