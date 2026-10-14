import { BaseIcon } from '../BaseIcon.tsx'
import type { IconProps } from './icon-props.ts'

export function CommentIcon({ style, ...props }: IconProps) {
  return <BaseIcon name="chat_1" style="line" size={20} {...props} svg_style={style} />
}
