import { BaseIcon } from '../BaseIcon.tsx'
import type { IconProps } from './icon-props.ts'

export function PenIcon({ style, ...props }: IconProps) {
  return <BaseIcon name="pencil" style="line" size={20} {...props} svg_style={style} />
}
