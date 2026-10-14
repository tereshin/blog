import { BaseIcon } from '../BaseIcon.tsx'
import type { IconProps } from './icon-props.ts'

export function AlertIcon({ style, ...props }: IconProps) {
  return <BaseIcon name="alert" style="line" size={20} {...props} svg_style={style} />
}
