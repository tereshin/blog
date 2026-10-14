import { BaseIcon } from '../BaseIcon.tsx'
import type { IconProps } from './icon-props.ts'

export function InboxIcon({ style, ...props }: IconProps) {
  return <BaseIcon name="inbox" style="line" size={20} {...props} svg_style={style} />
}
