import { BaseIcon } from '../BaseIcon.tsx'
import type { IconProps } from './icon-props.ts'

export function Chat3Icon({ style, icon_style = 'line', ...props }: IconProps & { icon_style?: 'line' | 'fill' }) {
  return (
    <BaseIcon name="chat_3" style={icon_style} size={20} {...props} svg_style={style} />
  )
}
